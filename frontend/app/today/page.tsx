import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShowUpToday, type ConfirmedData } from "@/components/ShowUpToday";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile sports
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, sports")
    .eq("id", user.id)
    .single();

  const displayName: string = profile?.display_name || user.email?.split("@")[0] || "there";
  const profileSports: string[] = (profile?.sports as string[]) ?? [];

  // Check if user already set availability for today (server-side UTC date)
  const todayUTC = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("availability")
    .select("sports, time_window, date")
    .eq("user_id", user.id)
    .eq("date", todayUTC)
    .maybeSingle();

  let existingData: ConfirmedData | null = null;
  if (existing) {
    // Parse tstzrange "[start,end)" back into a readable label
    const range = existing.time_window as string;
    const match = range.match(/"?([^",\]]+)"?,\s*"?([^")\]]+)"?/);
    let timeLabel = "Today";
    if (match) {
      const startH = new Date(match[1]).getHours();
      const endH = new Date(match[2]).getHours();
      timeLabel = `${String(startH).padStart(2, "0")}:00 – ${String(endH).padStart(2, "0")}:00`;
    }
    existingData = {
      sports: (existing.sports as string[]) ?? [],
      timeLabel,
      date: existing.date as string,
    };
  }

  return (
    <ShowUpToday
      displayName={displayName}
      profileSports={profileSports}
      existing={existingData}
    />
  );
}
