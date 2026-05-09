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
        venue_name, venue_location, status, group_size
      )
    `
    )
    .eq("user_id", user.id);

  // Community events: anything upcoming the user isn't already part of.
  const myEventIds = new Set(
    (participations ?? [])
      .map((p) => {
        const ev = (Array.isArray(p.events) ? p.events[0] : p.events) as { id?: string } | null;
        return ev?.id;
      })
      .filter((x): x is string => !!x)
  );

  const { data: communityRaw } = await supabase
    .from("events")
    .select("id, sport, start_time, venue_name, venue_location, status, group_size, captain_id")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  type CommunityEvent = {
    id: string;
    sport: string;
    start_time: string;
    venue_name: string | null;
    status: string;
    group_size: number;
    lat?: number;
    lng?: number;
  };

  const communityEvents: CommunityEvent[] = (communityRaw ?? [])
    .filter((e) => !myEventIds.has(e.id))
    .map((e) => {
      const loc = e.venue_location as unknown as { coordinates?: [number, number] } | null;
      let lat: number | undefined;
      let lng: number | undefined;
      if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        lng = loc.coordinates[0];
        lat = loc.coordinates[1];
      }
      return {
        id:         e.id,
        sport:      e.sport,
        start_time: e.start_time,
        venue_name: e.venue_name,
        status:     e.status,
        group_size: e.group_size,
        lat,
        lng,
      };
    });

  type EventRow = {
    id: string;
    sport: string;
    start_time: string;
    end_time: string;
    venue_name: string | null;
    venue_location: unknown;
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

  // Build map pins for the user's own events (same shape as communityEvents)
  type MyEventPin = {
    id: string;
    sport: string;
    start_time: string;
    venue_name: string | null;
    status: string;
    group_size: number;
    lat?: number;
    lng?: number;
  };

  const myEventPins: MyEventPin[] = events.map((ev) => {
    const loc = ev.venue_location as unknown as { coordinates?: [number, number] } | null;
    let lat: number | undefined;
    let lng: number | undefined;
    if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      lng = loc.coordinates[0];
      lat = loc.coordinates[1];
    }
    return { id: ev.id, sport: ev.sport, start_time: ev.start_time, venue_name: ev.venue_name, status: ev.status, group_size: ev.group_size, lat, lng };
  });

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-emerald-600/12 blur-3xl ambient-drift" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl ambient-drift" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-0 -right-32 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl ambient-drift" style={{ animationDelay: "6s" }} />
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-violet-600/8 blur-3xl ambient-drift" style={{ animationDelay: "9s" }} />
      </div>

      <header className="relative flex items-center justify-between px-5 sm:px-8 pt-6 pb-2 max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto">
        <Link href="/" className="text-white font-bold text-base sm:text-lg tracking-tight">
          ShowUp<span className="text-emerald-400">2</span>Move
        </Link>
        <Link
          href="/today"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5"
        >
          ← Today
        </Link>
      </header>

      <main className="relative px-5 sm:px-8 py-6 max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-black bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
            My Events
          </h1>
          <Link
            href="/events/new"
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full border bg-linear-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 active:scale-95"
          >
            <span className="text-base leading-none">+</span> Create event
          </Link>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((ev) => {
              const emoji = SPORT_EMOJI[ev.sport as Sport] ?? "🏅";
              const start = new Date(ev.start_time);
              const statusClass = STATUS_STYLES[ev.status] ?? STATUS_STYLES.forming;
              const isCapt = ev.role === "captain";

              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-center gap-4 w-full rounded-2xl bg-linear-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 border border-slate-700/60 hover:border-emerald-400/50 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.99] transition-all duration-300 p-4"
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
          <DiscoverEvents
            profileSports={profileSports}
            baseLat={baseLat}
            baseLng={baseLng}
            communityEvents={communityEvents}
            myEvents={myEventPins}
          />
        </div>
      </main>
    </div>
  );
}
