-- ============================================================
-- Migration: allow authenticated users to create their own events
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ----- Drop the original participant-read policies. -----
-- They self-reference event_participants and trigger
-- "infinite recursion detected in policy" at runtime.
-- They are replaced by the permissive "authenticated read all" policies below.
DROP POLICY IF EXISTS "events: participant read"              ON events;
DROP POLICY IF EXISTS "event_participants: participant read"  ON event_participants;
DROP POLICY IF EXISTS "chats: participant read"               ON chats;

-- ----- events: any signed-in user can read all events (for discovery) -----
DROP POLICY IF EXISTS "events: authenticated read all" ON events;
CREATE POLICY "events: authenticated read all"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- ----- events: users can create events where they are the captain -----
DROP POLICY IF EXISTS "events: captain insert" ON events;
CREATE POLICY "events: captain insert"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (captain_id = auth.uid());

-- ----- events: captain can update their own events -----
DROP POLICY IF EXISTS "events: captain update" ON events;
CREATE POLICY "events: captain update"
  ON events FOR UPDATE
  TO authenticated
  USING (captain_id = auth.uid())
  WITH CHECK (captain_id = auth.uid());

-- ----- event_participants: any signed-in user can read all rows -----
DROP POLICY IF EXISTS "event_participants: authenticated read all" ON event_participants;
CREATE POLICY "event_participants: authenticated read all"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

-- ----- event_participants: captain can self-add as participant on their event -----
DROP POLICY IF EXISTS "event_participants: captain self insert" ON event_participants;
CREATE POLICY "event_participants: captain self insert"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.captain_id = auth.uid()
    )
  );

-- ----- chats: captain can create the chat for their event -----
DROP POLICY IF EXISTS "chats: captain insert" ON chats;
CREATE POLICY "chats: captain insert"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.captain_id = auth.uid()
    )
  );

-- ----- chats: any signed-in user can read chat rows (replaces the dropped recursive policy) -----
DROP POLICY IF EXISTS "chats: authenticated read all" ON chats;
CREATE POLICY "chats: authenticated read all"
  ON chats FOR SELECT
  TO authenticated
  USING (true);
