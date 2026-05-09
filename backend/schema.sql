-- ============================================================
-- ShowUp2Move — Complete Database Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ============================================================
-- 1. PROFILES
-- Extends Supabase auth.users — one row per user.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT '',
  bio             TEXT,
  photo_url       TEXT,

  -- AI-populated fields
  sports          TEXT[]  NOT NULL DEFAULT '{}',   -- ['tennis', 'basketball']
  skill_levels    JSONB   NOT NULL DEFAULT '{}',   -- {"tennis": "intermediate"}
  ai_metadata     JSONB   NOT NULL DEFAULT '{}',   -- raw AI extraction output

  home_location   GEOGRAPHY(POINT, 4326),          -- user's home/default coords

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_home_loc ON profiles USING GIST(home_location);
CREATE INDEX IF NOT EXISTS idx_profiles_sports   ON profiles USING GIN(sports);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. AVAILABILITY
-- One row per user per day — "I'm showing up today."
-- ============================================================

CREATE TABLE IF NOT EXISTS availability (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  sports           TEXT[]      NOT NULL,                   -- subset of profile sports
  time_window      TSTZRANGE   NOT NULL,                   -- e.g. [17:00, 20:00)
  current_location GEOGRAPHY(POINT, 4326) NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'  -- pending | matched | expired
                   CHECK (status IN ('pending', 'matched', 'expired')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_availability_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_avail_loc         ON availability USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_avail_status_date ON availability(status, date);
CREATE INDEX IF NOT EXISTS idx_avail_user_date   ON availability(user_id, date DESC);


-- ============================================================
-- 3. EVENTS
-- A matched group activity.
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sport           TEXT        NOT NULL,
  captain_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  venue_name      TEXT,
  venue_location  GEOGRAPHY(POINT, 4326),
  venue_metadata  JSONB       NOT NULL DEFAULT '{}',       -- Google Places payload
  group_size      INT         NOT NULL CHECK (group_size > 0),
  status          TEXT        NOT NULL DEFAULT 'forming'   -- forming | confirmed | completed | cancelled
                  CHECK (status IN ('forming', 'confirmed', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_captain    ON events(captain_id);
CREATE INDEX IF NOT EXISTS idx_events_status     ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_venue_loc  ON events USING GIST(venue_location);


-- ============================================================
-- 4. EVENT PARTICIPANTS
-- Join table: who is in which event and their RSVP status.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_participants (
  event_id    UUID  NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT  NOT NULL DEFAULT 'player'   -- player | captain
              CHECK (role IN ('player', 'captain')),
  rsvp_status TEXT  NOT NULL DEFAULT 'invited'  -- invited | accepted | declined
              CHECK (rsvp_status IN ('invited', 'accepted', 'declined')),

  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ep_user_id  ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_ep_event_id ON event_participants(event_id);


-- ============================================================
-- 5. CHATS
-- One chat room per event.
-- ============================================================

CREATE TABLE IF NOT EXISTS chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. MESSAGES
-- Individual chat messages.
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = system
  content      TEXT        NOT NULL,
  message_type TEXT        NOT NULL DEFAULT 'user'  -- user | system | ai
               CHECK (message_type IN ('user', 'system', 'ai')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);


-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

-- ---------- profiles ----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read any profile (needed for event participant lists)
CREATE POLICY "profiles: authenticated read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- availability ----------
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Users can read all availability (needed for the matching UI / map)
CREATE POLICY "availability: authenticated read"
  ON availability FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert/update/delete their own availability
CREATE POLICY "availability: own insert"
  ON availability FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "availability: own update"
  ON availability FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "availability: own delete"
  ON availability FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- events ----------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Participants can read events they belong to
CREATE POLICY "events: participant read"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = id
        AND ep.user_id  = auth.uid()
    )
  );

-- Only the backend (service role / Edge Functions) creates events
-- Regular users cannot INSERT events directly
CREATE POLICY "events: service role insert"
  ON events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "events: service role update"
  ON events FOR UPDATE
  TO service_role
  USING (true);

-- ---------- event_participants ----------
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Users can see participants of events they are in
CREATE POLICY "event_participants: participant read"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants ep2
      WHERE ep2.event_id = event_id
        AND ep2.user_id  = auth.uid()
    )
  );

-- Users can update their own RSVP status
CREATE POLICY "event_participants: own rsvp update"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role manages all participant rows
CREATE POLICY "event_participants: service role all"
  ON event_participants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- chats ----------
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can read chats they are a participant of
CREATE POLICY "chats: participant read"
  ON chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = event_id
        AND ep.user_id  = auth.uid()
    )
  );

CREATE POLICY "chats: service role all"
  ON chats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- messages ----------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages in chats they belong to
CREATE POLICY "messages: participant read"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      JOIN event_participants ep ON ep.event_id = c.event_id
      WHERE c.id     = chat_id
        AND ep.user_id = auth.uid()
    )
  );

-- Users can insert their own messages into chats they belong to
CREATE POLICY "messages: participant insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats c
      JOIN event_participants ep ON ep.event_id = c.event_id
      WHERE c.id     = chat_id
        AND ep.user_id = auth.uid()
    )
  );

-- Service role sends system/ai messages
CREATE POLICY "messages: service role all"
  ON messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 8. REALTIME
-- Enable Realtime on tables the frontend subscribes to.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;


-- ============================================================
-- 9. HELPER: PostGIS proximity query
-- Exposed as a Postgres function so Edge Functions can call it
-- via supabase.rpc('nearby_available_users', {...})
-- ============================================================

CREATE OR REPLACE FUNCTION nearby_available_users(
  p_sport     TEXT,
  p_date      DATE,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_radius_m  INT DEFAULT 5000
)
RETURNS TABLE (
  user_id          UUID,
  display_name     TEXT,
  skill_levels     JSONB,
  current_location GEOGRAPHY,
  time_window      TSTZRANGE,
  distance_m       DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.user_id,
    p.display_name,
    p.skill_levels,
    a.current_location,
    a.time_window,
    ST_Distance(a.current_location, ST_MakePoint(p_lng, p_lat)::GEOGRAPHY) AS distance_m
  FROM availability a
  JOIN profiles p ON p.id = a.user_id
  WHERE a.date   = p_date
    AND a.status = 'pending'
    AND p_sport  = ANY(a.sports)
    AND ST_DWithin(
          a.current_location,
          ST_MakePoint(p_lng, p_lat)::GEOGRAPHY,
          p_radius_m
        )
  ORDER BY distance_m ASC;
$$;
