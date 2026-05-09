"use server";

import { createClient } from "@/lib/supabase/server";

const SPORT_PLACE_TYPES: Record<string, string[]> = {
  tennis:       ["tennis_court"],
  table_tennis: ["sports_complex"],
  badminton:    ["badminton_court"],
  golf:         ["golf_course"],
  running:      ["park", "athletic_field"],
  cycling:      ["park"],
  swimming:     ["swimming_pool"],
  climbing:     ["climbing_gym"],
  basketball:   ["basketball_court"],
  volleyball:   ["volleyball_court"],
  football:     ["football_field", "athletic_field"],
  rugby:        ["athletic_field"],
  cricket:      ["cricket_ground", "athletic_field"],
  hockey:       ["athletic_field"],
  skiing:       ["ski_resort"],
};

export type VenueResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placesId: string | null;
} | null;

export async function findAndSaveVenue(
  eventId: string,
  lat: number,
  lng: number,
  sport: string
): Promise<VenueResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const types = SPORT_PLACE_TYPES[sport] ?? ["sports_complex"];
  let venue: VenueResult = null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress",
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: 1,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 2000.0,
          },
        },
      }),
      cache: "no-store",
    });

    const data = await res.json();
    const place = data.places?.[0];

    if (place) {
      venue = {
        name:     place.displayName?.text ?? "Nearby Venue",
        address:  place.formattedAddress ?? "",
        lat:      place.location?.latitude  ?? lat,
        lng:      place.location?.longitude ?? lng,
        placesId: place.id ?? null,
      };

      // Persist venue back to the event via SECURITY DEFINER RPC
      const supabase = await createClient();
      await supabase.rpc("set_event_venue", {
        p_event_id:      eventId,
        p_venue_name:    venue.name,
        p_venue_address: venue.address,
        p_venue_lat:     venue.lat,
        p_venue_lng:     venue.lng,
        p_places_id:     venue.placesId,
      });
    }
  } catch (err) {
    console.error("Google Places lookup failed:", err);
  }

  return venue;
}
