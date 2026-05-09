"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

export async function createPoll(
  eventId: string,
  question: string,
  options: string[]
): Promise<ActionResult> {
  const trimmedQuestion = question.trim();
  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

  if (!trimmedQuestion) return { error: "Question is required." };
  if (cleanOptions.length < 2) return { error: "Add at least two options." };
  if (cleanOptions.length > 8) return { error: "Maximum 8 options per poll." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: poll, error: pollErr } = await supabase
    .from("polls")
    .insert({ event_id: eventId, question: trimmedQuestion, created_by: user.id })
    .select("id")
    .single();

  if (pollErr || !poll) return { error: pollErr?.message ?? "Could not create poll." };

  const { error: optErr } = await supabase
    .from("poll_options")
    .insert(
      cleanOptions.map((label, i) => ({ poll_id: poll.id, label, position: i }))
    );

  if (optErr) {
    // best-effort cleanup
    await supabase.from("polls").delete().eq("id", poll.id);
    return { error: optErr.message };
  }

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function castVote(
  pollId: string,
  optionId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  // upsert one vote per user per poll
  const { error } = await supabase
    .from("poll_votes")
    .upsert(
      { poll_id: pollId, user_id: user.id, option_id: optionId },
      { onConflict: "poll_id,user_id" }
    );

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function closePoll(pollId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("polls")
    .update({ closed: true })
    .eq("id", pollId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return {};
}
