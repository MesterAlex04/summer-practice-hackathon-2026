-- ============================================================
-- ShowUp2Move — Greedy Matching Engine + Venue RPC
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================


-- ============================================================
-- 1. MATCHING FUNCTION
-- Greedy algorithm: for each sport, iterate pending users as
-- seeds and collect the nearest neighbours within radius_m
-- that share an overlapping time window. When headcount
-- reaches the sport's minimum, commit the group as an event.
-- ============================================================

CREATE OR REPLACE FUNCTION match_pending_users(
  target_date DATE DEFAULT CURRENT_DATE,
  radius_m    INT  DEFAULT 5000          -- search radius in metres
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER                         -- bypasses RLS so it can write events
SET search_path = public
AS $$
DECLARE
  v_sport          TEXT;
  v_seed           RECORD;
  v_candidate      RECORD;
  v_min_group      INT;
  v_max_group      INT;
  v_group_members  UUID[];
  v_event_id       UUID;
  v_captain_id     UUID;
  v_centroid_lng   DOUBLE PRECISION;
  v_centroid_lat   DOUBLE PRECISION;
  v_start_time     TIMESTAMPTZ;
  v_end_time       TIMESTAMPTZ;
  v_used           UUID[] := '{}';       -- user_ids already placed in a group
  v_events_created INT    := 0;
BEGIN

  -- ── Outer loop: one pass per sport ───────────────────────────────────────────
  FOR v_sport IN
    SELECT DISTINCT unnest(sports)
    FROM   availability
    WHERE  date = target_date AND status = 'pending'
    ORDER  BY 1
  LOOP

    -- Minimum players required to form a valid event for this sport
    v_min_group := CASE v_sport
      WHEN 'tennis'       THEN 2
      WHEN 'table_tennis' THEN 2
      WHEN 'badminton'    THEN 2
      WHEN 'golf'         THEN 2
      WHEN 'running'      THEN 2
      WHEN 'cycling'      THEN 2
      WHEN 'swimming'     THEN 2
      WHEN 'climbing'     THEN 2
      WHEN 'basketball'   THEN 5
      WHEN 'volleyball'   THEN 6
      WHEN 'football'     THEN 6
      WHEN 'rugby'        THEN 7
      WHEN 'cricket'      THEN 6
      WHEN 'hockey'       THEN 6
      ELSE 2
    END;
    v_max_group := v_min_group * 2;      -- cap group size to keep it manageable

    -- ── Inner loop: greedy — each unmatched user is tried as a seed ──────────
    FOR v_seed IN
      SELECT a.user_id, a.current_location, a.time_window
      FROM   availability a
      WHERE  a.date   = target_date
        AND  a.status = 'pending'
        AND  v_sport  = ANY(a.sports)
      ORDER  BY a.created_at ASC         -- FIFO: earlier request = seed priority
    LOOP
      -- Skip seeds already consumed by a previously formed group this run
      CONTINUE WHEN v_seed.user_id = ANY(v_used);

      -- Collect nearest neighbours: same sport, pending, within radius, overlapping window
      v_group_members := ARRAY[v_seed.user_id];

      FOR v_candidate IN
        SELECT a.user_id
        FROM   availability a
        WHERE  a.date        = target_date
          AND  a.status      = 'pending'
          AND  v_sport       = ANY(a.sports)
          AND  a.user_id    <> v_seed.user_id
          AND  NOT (a.user_id = ANY(v_used))
          AND  ST_DWithin(a.current_location, v_seed.current_location, radius_m)
          AND  a.time_window && v_seed.time_window   -- overlapping windows
        ORDER  BY ST_Distance(a.current_location, v_seed.current_location) ASC
        LIMIT  v_max_group - 1
      LOOP
        v_group_members := array_append(v_group_members, v_candidate.user_id);
      END LOOP;

      -- Not enough players — leave them pending for next run or another seed
      CONTINUE WHEN array_length(v_group_members, 1) < v_min_group;

      -- Captain = the seed (earliest FIFO requester)
      v_captain_id := v_seed.user_id;

      -- Geographic centroid of the matched group
      SELECT ST_X(ST_Centroid(ST_Collect(current_location::geometry))::geometry),
             ST_Y(ST_Centroid(ST_Collect(current_location::geometry))::geometry)
      INTO   v_centroid_lng, v_centroid_lat
      FROM   availability
      WHERE  user_id = ANY(v_group_members) AND date = target_date;

      -- Tightest overlapping time slot (intersection of all windows)
      SELECT MAX(lower(time_window)), MIN(upper(time_window))
      INTO   v_start_time, v_end_time
      FROM   availability
      WHERE  user_id = ANY(v_group_members) AND date = target_date;

      -- Guard: degenerate interval (shouldn't occur given && filter, but be safe)
      CONTINUE WHEN v_start_time >= v_end_time;

      -- ── Create event ─────────────────────────────────────────────────────────
      INSERT INTO events (
        sport, captain_id, start_time, end_time,
        group_size, status,
        venue_location,   -- placeholder centroid; overwritten when venue is found
        venue_metadata    -- stores centroid so frontend can query Google Places
      )
      VALUES (
        v_sport, v_captain_id, v_start_time, v_end_time,
        array_length(v_group_members, 1), 'forming',
        ST_MakePoint(v_centroid_lng, v_centroid_lat)::GEOGRAPHY,
        jsonb_build_object(
          'centroid_lat', v_centroid_lat,
          'centroid_lng', v_centroid_lng
        )
      )
      RETURNING id INTO v_event_id;

      -- ── Create chat room ──────────────────────────────────────────────────────
      INSERT INTO chats (event_id) VALUES (v_event_id);

      -- ── Add all participants ──────────────────────────────────────────────────
      INSERT INTO event_participants (event_id, user_id, role, rsvp_status)
      SELECT v_event_id,
             u,
             CASE WHEN u = v_captain_id THEN 'captain' ELSE 'player' END,
             'invited'
      FROM   unnest(v_group_members) AS u;

      -- ── Mark availability rows as consumed ───────────────────────────────────
      UPDATE availability
      SET    status = 'matched'
      WHERE  user_id = ANY(v_group_members) AND date = target_date;

      v_used           := v_used || v_group_members;
      v_events_created := v_events_created + 1;

    END LOOP; -- seeds
  END LOOP;   -- sports

  RETURN jsonb_build_object(
    'events_created', v_events_created,
    'date',           target_date,
    'radius_m',       radius_m
  );
END;
$$;


-- ============================================================
-- 2. VENUE UPDATE RPC
-- Called from the frontend when the first participant loads
-- the event detail page. SECURITY DEFINER so it can bypass
-- the service_role-only UPDATE policy on events, but it gates
-- on the caller being an actual participant.
-- ============================================================

CREATE OR REPLACE FUNCTION set_event_venue(
  p_event_id      UUID,
  p_venue_name    TEXT,
  p_venue_address TEXT,
  p_venue_lat     DOUBLE PRECISION,
  p_venue_lng     DOUBLE PRECISION,
  p_places_id     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only a participant of this event may trigger a venue update
  IF NOT EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_id = p_event_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant of event %', p_event_id;
  END IF;

  -- Only update when venue_name is still NULL (idempotent first-writer wins)
  UPDATE events
  SET
    venue_name     = p_venue_name,
    venue_location = ST_MakePoint(p_venue_lng, p_venue_lat)::GEOGRAPHY,
    venue_metadata = jsonb_build_object(
      'name',      p_venue_name,
      'address',   p_venue_address,
      'lat',       p_venue_lat,
      'lng',       p_venue_lng,
      'places_id', p_places_id
    )
  WHERE id = p_event_id AND venue_name IS NULL;
END;
$$;


-- ============================================================
-- 3. PG_CRON SCHEDULE
-- Runs matching automatically every day at 15:00 UTC.
-- If you re-run this script, unschedule the old job first:
--   SELECT cron.unschedule('match-users-daily');
-- ============================================================

SELECT cron.schedule(
  'match-users-daily',
  '0 15 * * *',
  $$SELECT match_pending_users(CURRENT_DATE)$$
);
