import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";
import DiscoverEvents from "@/components/DiscoverEvents";

const STATUS_STYLES: Record<string, string> = {
  forming:   "text-amber-400 bg-amber-500/15 border-amber-500/30",
  confirmed: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  completed: "text-slate-400 bg-slate-700/60 border-slate-600",
  cancelled: "text-red-400 bg-red-500/15 border-red-500/30",
};

export default async function EventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: avail }] = await Promise.all([
    supabase.from("profiles").select("sports").eq("id", user.id).single(),
    supabase
      .from("availability")
      .select("current_location")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profileSports: string[] = (profile?.sports as string[]) ?? [];

  let baseLat: number | undefined;
  let baseLng: number | undefined;
  if (avail?.current_location) {
    const loc = avail.current_location as unknown as { coordinates?: [number, number] };
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      baseLng = loc.coordinates[0];
      baseLat = loc.coordinates[1];
    }
  }

  const { data: participations } = await supabase
    .from("event_participants")
    .select(
      `
      role,
      rsvp_status,
      events (
        id, sport, start_time, end_time,
        venue_name, status, group_size
      )
    `
    )
    .eq("user_id", user.id);

  type EventRow = {
    id: string;
    sport: string;
    start_time: string;
    end_time: string;
    venue_name: string | null;
    status: string;
    group_size: number;
    role: string;
    rsvp_status: string;
  };

  const events: EventRow[] = (participations ?? [])
    .flatMap((p) => {
      // Supabase types the FK join as an array; at runtime it's a single object
      const evRaw = p.events as unknown;
      const ev = (Array.isArray(evRaw) ? evRaw[0] : evRaw) as Omit<EventRow, "role" | "rsvp_status"> | null;
      if (!ev) return [];
      return [{ ...ev, role: p.role, rsvp_status: p.rsvp_status }];
    })
    .sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      <header className="relative flex items-center justify-between px-5 pt-6 pb-2">
        <Link href="/" className="text-white font-bold text-base tracking-tight">
          ShowUp<span className="text-emerald-400">2</span>Move
        </Link>
        <Link
          href="/today"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5"
        >
          ← Today
        </Link>
      </header>

      <main className="relative px-5 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-white mb-6">My Events</h1>

        {events.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 gap-4">
            <span className="text-6xl">🏃</span>
            <div className="space-y-1">
              <p className="text-white font-semibold">No events yet</p>
              <p className="text-slate-500 text-sm max-w-xs">
                Mark yourself as available on the Today page and we&apos;ll auto-match you with nearby players.
              </p>
            </div>
            <Link
              href="/today"
              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium border border-emerald-500/30 hover:border-emerald-400/50 rounded-full px-6 py-2.5 transition-colors"
            >
              Go to Today →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const emoji = SPORT_EMOJI[ev.sport as Sport] ?? "🏅";
              const start = new Date(ev.start_time);
              const statusClass = STATUS_STYLES[ev.status] ?? STATUS_STYLES.forming;
              const isCapt = ev.role === "captain";

              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-center gap-4 w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-700/60 active:scale-[0.99] transition-all p-4"
                >
                  <span className="text-3xl shrink-0">{emoji}</span>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-white font-semibold capitalize">
                      {ev.sport.replace("_", " ")}
                      {isCapt && <span className="ml-1.5 text-amber-400 text-sm">👑</span>}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {start.toLocaleDateString("en-US", {
                        weekday: "short",
                        month:   "short",
                        day:     "numeric",
                      })}{" "}
                      · {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {ev.venue_name && (
                      <p className="text-emerald-400/80 text-xs truncate">
                        📍 {ev.venue_name}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${statusClass}`}
                    >
                      {ev.status}
                    </span>
                    <span className="text-slate-500 text-xs">{ev.group_size} players</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <DiscoverEvents profileSports={profileSports} baseLat={baseLat} baseLng={baseLng} />
        </div>
      </main>
    </div>
  );
}
