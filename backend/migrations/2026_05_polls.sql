-- ============================================================
-- Migration: Group voting / polling for events
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS polls (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question    TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  closed      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_event ON polls(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS poll_options (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  position INT  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id    UUID        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_id  UUID        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);

-- ============================================================
-- RLS — only event participants can read/write
-- ============================================================

ALTER TABLE polls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes    ENABLE ROW LEVEL SECURITY;

-- ---------- polls ----------
DROP POLICY IF EXISTS "polls: participant read" ON polls;
CREATE POLICY "polls: participant read"
  ON polls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = polls.event_id
        AND ep.user_id  = auth.uid()
    )
  );

DROP POLICY IF EXISTS "polls: participant insert" ON polls;
CREATE POLICY "polls: participant insert"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = polls.event_id
        AND ep.user_id  = auth.uid()
    )
  );

DROP POLICY IF EXISTS "polls: creator update" ON polls;
CREATE POLICY "polls: creator update"
  ON polls FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ---------- poll_options ----------
DROP POLICY IF EXISTS "poll_options: participant read" ON poll_options;
CREATE POLICY "poll_options: participant read"
  ON poll_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      JOIN event_participants ep ON ep.event_id = p.event_id
      WHERE p.id     = poll_options.poll_id
        AND ep.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "poll_options: creator insert" ON poll_options;
CREATE POLICY "poll_options: creator insert"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_options.poll_id
        AND p.created_by = auth.uid()
    )
  );

-- ---------- poll_votes ----------
DROP POLICY IF EXISTS "poll_votes: participant read" ON poll_votes;
CREATE POLICY "poll_votes: participant read"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      JOIN event_participants ep ON ep.event_id = p.event_id
      WHERE p.id = poll_votes.poll_id
        AND ep.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "poll_votes: own insert" ON poll_votes;
CREATE POLICY "poll_votes: own insert"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p
      JOIN event_participants ep ON ep.event_id = p.event_id
      WHERE p.id = poll_votes.poll_id
        AND ep.user_id = auth.uid()
        AND p.closed = FALSE
    )
  );

DROP POLICY IF EXISTS "poll_votes: own update" ON poll_votes;
CREATE POLICY "poll_votes: own update"
  ON poll_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "poll_votes: own delete" ON poll_votes;
CREATE POLICY "poll_votes: own delete"
  ON poll_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Realtime so votes update live across clients
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE polls;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
