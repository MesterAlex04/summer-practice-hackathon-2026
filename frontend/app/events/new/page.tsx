import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateEventForm from "./CreateEventForm";

export default async function NewEventPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Best-effort: use latest availability location as a starting point on the map
  const { data: avail } = await supabase
    .from("availability")
    .select("current_location")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let baseLat: number | undefined;
  let baseLng: number | undefined;
  if (avail?.current_location) {
    const loc = avail.current_location as unknown as { coordinates?: [number, number] };
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      baseLng = loc.coordinates[0];
      baseLat = loc.coordinates[1];
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-emerald-600/12 blur-3xl ambient-drift" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl ambient-drift" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-0 -right-32 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl ambient-drift" style={{ animationDelay: "6s" }} />
      </div>

      <header className="relative flex items-center justify-between px-5 sm:px-8 pt-6 pb-2 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <Link href="/" className="text-white font-bold text-base sm:text-lg tracking-tight">
          ShowUp<span className="text-emerald-400">2</span>Move
        </Link>
        <Link
          href="/events"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5"
        >
          ← My Events
        </Link>
      </header>

      <main className="relative px-5 sm:px-8 py-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black mb-2 bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
          Create Event
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Pick a sport, time and venue. We&apos;ll add you as captain and open a group chat.
        </p>

        <CreateEventForm initialLat={baseLat} initialLng={baseLng} />
      </main>
    </div>
  );
}
