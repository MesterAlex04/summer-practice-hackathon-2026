import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventDetail } from "@/components/EventDetail";
import { findAndSaveVenue, type VenueResult } from "./actions";

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
    />
  );
}
