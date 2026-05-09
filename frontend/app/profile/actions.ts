"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractSportsFromBio, type ExtractedSport } from "@/lib/gemini";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  extractedSports?: ExtractedSport[];
  aiWarning?: string;
};

export async function saveProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Not authenticated. Please sign in again." };
  }

  const displayName = (formData.get("displayName") as string).trim();
  const bio = (formData.get("bio") as string).trim();

  if (!displayName) {
    return { status: "error", message: "Display name is required." };
  }

  // --- AI extraction via Gemini ---
  let extractedSports: ExtractedSport[] = [];
  let aiWarning: string | undefined;

  if (bio) {
    try {
      extractedSports = await extractSportsFromBio(bio);
    } catch (err) {
      console.error("Gemini extraction failed:", err);
      aiWarning =
        err instanceof Error
          ? `AI detection failed: ${err.message}`
          : "AI sport detection is unavailable right now — check your GEMINI_API_KEY.";
    }
  }

  const sports = extractedSports.map((s) => s.sport);
  const skill_levels = Object.fromEntries(
    extractedSports.map((s) => [s.sport, s.skill_level])
  );

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        bio,
        sports,
        skill_levels,
        ai_metadata: { source: "bio_gemini", extracted: extractedSports },
      },
      { onConflict: "id" }
    );

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/profile");

  return { status: "success", extractedSports, aiWarning };
}
