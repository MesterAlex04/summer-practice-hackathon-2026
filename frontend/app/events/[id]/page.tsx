import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventDetail } from "@/components/EventDetail";
import { findAndSaveVenue, type VenueResult } from "./actions";
import { fetchWeatherForEvent } from "@/lib/weather";
import type { Poll, PollOption } from "@/components/EventPolls";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      id, sport, captain_id, start_time, end_time,
      venue_name, venue_metadata, venue_location, group_size, status,
      event_participants (
        user_id, role, rsvp_status,
        profiles ( display_name, photo_url )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !event) notFound();

  // Parse venue_location (PostGIS GEOGRAPHY → GeoJSON {type, coordinates:[lng,lat]})
  const venueLocRaw = event.venue_location as unknown as { coordinates?: [number, number] } | null;
  let venueLat: number | undefined;
  let venueLng: number | undefined;
  if (venueLocRaw && Array.isArray(venueLocRaw.coordinates) && venueLocRaw.coordinates.length >= 2) {
    venueLng = venueLocRaw.coordinates[0];
    venueLat = venueLocRaw.coordinates[1];
  }

  // venue_metadata holds centroid coords (set by match_pending_users)
  // and is overwritten with Google Places data once a venue is found
  const meta = (event.venue_metadata ?? {}) as Record<string, unknown>;
  const centroidLat = (meta.centroid_lat ?? meta.lat ?? venueLat) as number | undefined;
  const centroidLng = (meta.centroid_lng ?? meta.lng ?? venueLng) as number | undefined;

  let venue: VenueResult = event.venue_name
    ? {
        name:     event.venue_name as string,
        address:  (meta.address as string) ?? "",
        lat:      (meta.lat as number) ?? venueLat ?? centroidLat ?? 0,
        lng:      (meta.lng as number) ?? venueLng ?? centroidLng ?? 0,
        placesId: (meta.places_id as string) ?? null,
      }
    : null;

  // First participant to load the page triggers the Google Places lookup
  if (!venue && centroidLat !== undefined && centroidLng !== undefined) {
    venue = await findAndSaveVenue(
      event.id as string,
      centroidLat,
      centroidLng,
      event.sport as string
    );
  }

  const participants = (event.event_participants ?? []) as unknown as Array<{
    user_id: string;
    role: "captain" | "player";
    rsvp_status: "invited" | "accepted" | "declined";
    profiles: { display_name: string; photo_url: string | null } | null;
  }>;

  // ---- Weather forecast (Open-Meteo) ----
  const startDate = new Date(event.start_time as string);
  const wxLat = venue?.lat ?? centroidLat;
  const wxLng = venue?.lng ?? centroidLng;
  const weather =
    wxLat !== undefined && wxLng !== undefined
      ? await fetchWeatherForEvent(wxLat, wxLng, startDate)
      : null;

  // ---- Polls ----
  const { data: pollRows } = await supabase
    .from("polls")
    .select(`
      id, question, created_by, closed, created_at,
      poll_options ( id, label, position ),
      poll_votes   ( option_id, user_id )
    `)
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  type PollRow = {
    id: string;
    question: string;
    created_by: string;
    closed: boolean;
    created_at: string;
    poll_options: { id: string; label: string; position: number }[] | null;
    poll_votes:   { option_id: string; user_id: string }[] | null;
  };

  const polls: Poll[] = (pollRows as PollRow[] ?? []).map((p) => {
    const votes = p.poll_votes ?? [];
    const counts = new Map<string, number>();
    for (const v of votes) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);

    const options: PollOption[] = (p.poll_options ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({
        id:       o.id,
        label:    o.label,
        position: o.position,
        votes:    counts.get(o.id) ?? 0,
      }));

    const myVote = votes.find((v) => v.user_id === user.id);

    return {
      id:              p.id,
      question:        p.question,
      created_by:      p.created_by,
      closed:          p.closed,
      created_at:      p.created_at,
      options,
      myVoteOptionId:  myVote?.option_id ?? null,
      totalVotes:      votes.length,
    };
  });

  return (
    <EventDetail
      id={event.id as string}
      sport={event.sport as string}
      captainId={event.captain_id as string}
      currentUserId={user.id}
      startTime={event.start_time as string}
      endTime={event.end_time as string}
      groupSize={event.group_size as number}
      status={event.status as string}
      venue={venue}
      centroidLat={centroidLat}
      centroidLng={centroidLng}
      participants={participants}
      weather={weather}
      polls={polls}
    />
  );
}
