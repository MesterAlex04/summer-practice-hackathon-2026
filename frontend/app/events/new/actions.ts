"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SPORT_OPTIONS } from "@/lib/sports";

export type CreateEventState = {
  status: "idle" | "error";
  message?: string;
};

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in to create an event." };

  const sport       = String(formData.get("sport") ?? "").trim();
  const venueName   = String(formData.get("venue_name") ?? "").trim();
  const startTime   = String(formData.get("start_time") ?? "").trim();
  const endTime     = String(formData.get("end_time") ?? "").trim();
  const groupSizeS  = String(formData.get("group_size") ?? "").trim();
  const lat         = Number(formData.get("lat"));
  const lng         = Number(formData.get("lng"));

  if (!SPORT_OPTIONS.includes(sport as (typeof SPORT_OPTIONS)[number])) {
    return { status: "error", message: "Pick a sport from the list." };
  }
  if (!startTime || !endTime) {
    return { status: "error", message: "Start and end times are required." };
  }
  const start = new Date(startTime);
  const end   = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { status: "error", message: "Invalid date/time." };
  }
  if (end <= start) {
    return { status: "error", message: "End time must be after start time." };
  }
  const groupSize = parseInt(groupSizeS, 10);
  if (!Number.isFinite(groupSize) || groupSize < 2 || groupSize > 30) {
    return { status: "error", message: "Group size must be between 2 and 30." };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: "error", message: "Pick a venue on the map." };
  }

  // Insert event (captain = current user)
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .insert({
      sport,
      captain_id:     user.id,
      start_time:     start.toISOString(),
      end_time:       end.toISOString(),
      venue_name:     venueName || null,
      venue_location: `POINT(${lng} ${lat})`,
      group_size:     groupSize,
      status:         "forming",
    })
    .select("id")
    .single();

  if (eventErr || !event) {
    return { status: "error", message: eventErr?.message ?? "Failed to create event." };
  }

  // Add captain as participant
  const { error: partErr } = await supabase
    .from("event_participants")
    .insert({
      event_id:    event.id,
      user_id:     user.id,
      role:        "captain",
      rsvp_status: "accepted",
    });

  if (partErr) {
    return { status: "error", message: partErr.message };
  }

  // Create chat for the event
  await supabase.from("chats").insert({ event_id: event.id });

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}
