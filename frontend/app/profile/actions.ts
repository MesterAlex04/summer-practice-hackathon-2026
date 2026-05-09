"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  extractSportsFromBio,
  extractSportsFromPhoto,
  mergeSports,
  type ExtractedSport,
} from "@/lib/gemini";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  extractedSports?: ExtractedSport[];
  aiWarning?: string;
  photoUrl?: string;
};

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB

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
  const bio         = (formData.get("bio") as string).trim();
  const photoFile   = formData.get("photo") as File | null;

  if (!displayName) {
    return { status: "error", message: "Display name is required." };
  }

  // --- Photo upload (optional) ---
  let photoUrl: string | undefined;
  let photoSports: ExtractedSport[] = [];
  let aiWarning: string | undefined;

  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > MAX_PHOTO_BYTES) {
      return { status: "error", message: "Photo must be under 4 MB." };
    }
    if (!photoFile.type.startsWith("image/")) {
      return { status: "error", message: "Photo must be an image file." };
    }

    const ext  = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadErr) {
      return { status: "error", message: `Photo upload failed: ${uploadErr.message}` };
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    photoUrl = pub.publicUrl;

    // --- Photo-based sport detection (best-effort) ---
    try {
      const buffer = await photoFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      photoSports  = await extractSportsFromPhoto(base64, photoFile.type);
    } catch (err) {
      console.error("Photo sport detection failed:", err);
      // Non-fatal — keep going with bio extraction only.
    }
  }

  // --- Bio extraction (optional) ---
  let bioSports: ExtractedSport[] = [];

  if (bio) {
    try {
      bioSports = await extractSportsFromBio(bio);
    } catch (err) {
      console.error("Gemini extraction failed:", err);
      aiWarning =
        err instanceof Error
          ? `AI detection failed: ${err.message}`
          : "AI sport detection is unavailable right now — check your GEMINI_API_KEY.";
    }
  }

  const extractedSports = mergeSports(bioSports, photoSports);

  const sports = extractedSports.map((s) => s.sport);
  const skill_levels = Object.fromEntries(
    extractedSports.map((s) => [s.sport, s.skill_level])
  );

  const updates: Record<string, unknown> = {
    id: user.id,
    display_name: displayName,
    bio,
    sports,
    skill_levels,
    ai_metadata: {
      source: photoSports.length > 0 ? "bio+photo_gemini" : "bio_gemini",
      bio_extracted:   bioSports,
      photo_extracted: photoSports,
    },
  };
  if (photoUrl) updates.photo_url = photoUrl;

  const { error } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/profile");

  return { status: "success", extractedSports, aiWarning, photoUrl };
}
