import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, sports, skill_levels, photo_url")
    .eq("id", user.id)
    .single();

  // Reconstruct the ExtractedSport[] shape from stored data
  const savedSports = ((profile?.sports as string[]) ?? []).map((sport) => ({
    sport,
    skill_level: ((profile?.skill_levels as Record<string, string>)?.[sport] ?? "beginner") as import("@/lib/sports").SkillLevel,
  }));

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-center">
        <div className="h-[40rem] w-[40rem] rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 shadow-lg mb-2">
            <span className="text-2xl">🏃</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            ShowUp<span className="text-emerald-400">2</span>Move
          </h1>
          <p className="text-slate-400 text-sm">Step 1 of 2 — Set up your profile</p>
        </div>

        <ProfileForm
          defaultDisplayName={profile?.display_name ?? ""}
          defaultBio={profile?.bio ?? ""}
          savedSports={savedSports}
          currentPhotoUrl={(profile?.photo_url as string | null) ?? null}
        />
      </div>
    </main>
  );
}
