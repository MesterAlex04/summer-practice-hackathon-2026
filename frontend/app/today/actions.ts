"use server";

import { createClient } from "@/lib/supabase/server";

export type ShowUpInput = {
  lat: number;
  lng: number;
  sports: string[];
  startISO: string;
  endISO: string;
  date: string; // YYYY-MM-DD in user's local timezone
};

export type ActionResult = { success: boolean; error?: string };

export async function showUpToday(input: ShowUpInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };

  // Ensure a profiles row exists (trigger only fires on new signups; backfills existing accounts).
  await supabase.from("profiles").upsert(
    { id: user.id, display_name: user.email?.split("@")[0] ?? "" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // Geography: PostgREST accepts WKT text which PostgreSQL casts to GEOGRAPHY.
  // tstzrange: PostgreSQL range literal "[start,end)" is accepted as plain text.
  const { error } = await supabase.from("availability").upsert(
    {
      user_id: user.id,
      date: input.date,
      sports: input.sports,
      time_window: `[${input.startISO},${input.endISO})`,
      current_location: `POINT(${input.lng} ${input.lat})`,
      status: "pending",
    },
    { onConflict: "user_id,date" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function cancelAvailability(date: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
