-- ============================================================
-- Migration: allow any authenticated user to join events as a player
-- Also ensures the messages table is in the realtime publication.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Any signed-in user can insert themselves as a player on an open event.
DROP POLICY IF EXISTS "event_participants: player join" ON event_participants;
CREATE POLICY "event_participants: player join"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'player'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
        AND e.status IN ('forming', 'confirmed')
    )
  );

-- Ensure the messages table delivers real-time INSERT events to subscribers.
-- Safe to run even if the table is already in the publication.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
