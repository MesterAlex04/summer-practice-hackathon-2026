"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";
import type { MapPin } from "./EventsMapView";

const EventsMapView = dynamic(() => import("./EventsMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse flex items-center justify-center">
      <span className="text-slate-500 text-sm">Loading map…</span>
    </div>
  ),
});

type DemoEvent = {
  id: string;
  sport: string;
  venue: string;
  time: string;
  players: number;
  max: number;
  distance: string;
  dLat: number;
  dLng: number;
  participants: string[];
};

const DEMO_EVENTS: DemoEvent[] = [
  { id: "d1",  sport: "tennis",       venue: "Millennium Sports Park",  time: "Today · 6:00 PM",     players: 2,  max: 4,  distance: "0.8 km",  dLat:  0.007, dLng:  0.010, participants: ["Alex M.", "Sam K."] },
  { id: "d2",  sport: "football",     venue: "Central Athletic Ground", time: "Tomorrow · 5:30 PM",  players: 8,  max: 11, distance: "1.2 km",  dLat:  0.011, dLng: -0.013, participants: ["Jordan T.", "Chris L.", "Taylor W.", "Morgan A.", "Casey B.", "Jamie R.", "Drew P."] },
  { id: "d3",  sport: "basketball",   venue: "Downtown Courts",         time: "Today · 7:00 PM",     players: 4,  max: 5,  distance: "2.1 km",  dLat: -0.019, dLng:  0.014, participants: ["Riley S.", "Quinn A.", "Blake N.", "Parker O."] },
  { id: "d4",  sport: "cycling",      venue: "Riverside Greenway",      time: "Tomorrow · 9:00 AM",  players: 3,  max: 6,  distance: "0.5 km",  dLat:  0.004, dLng: -0.003, participants: ["Avery J.", "Skyler B.", "Reese M."] },
  { id: "d5",  sport: "running",      venue: "City Park Loop",          time: "Mon · 7:00 AM",       players: 5,  max: 8,  distance: "1.8 km",  dLat: -0.012, dLng:  0.015, participants: ["Finley O.", "Harley W.", "Sage P.", "River A.", "Dakota L."] },
  { id: "d6",  sport: "volleyball",   venue: "Beach Courts North",      time: "Tomorrow · 11:00 AM", players: 8,  max: 12, distance: "4.1 km",  dLat: -0.025, dLng:  0.030, participants: ["Emery C.", "Lennon D.", "Rowan F.", "Phoenix G.", "Marley H.", "Landry I.", "Elliot J.", "Peyton K."] },
  { id: "d7",  sport: "swimming",     venue: "Olympic Aquatic Centre",  time: "Mon · 7:00 AM",       players: 3,  max: 8,  distance: "2.8 km",  dLat:  0.022, dLng: -0.018, participants: ["Remy N.", "Sawyer P.", "Hayden Q."] },
  { id: "d8",  sport: "badminton",    venue: "Sports Hub Arena",        time: "Today · 8:00 PM",     players: 2,  max: 4,  distance: "1.5 km",  dLat:  0.009, dLng:  0.011, participants: ["Addison R.", "Sterling S."] },
  { id: "d9",  sport: "table_tennis", venue: "Community Centre Hall",   time: "Mon · 7:00 PM",       players: 2,  max: 4,  distance: "0.9 km",  dLat:  0.006, dLng: -0.006, participants: ["Oakley T.", "Indigo U."] },
  { id: "d10", sport: "climbing",     venue: "Peak Climbing Center",    time: "Tomorrow · 2:00 PM",  players: 2,  max: 4,  distance: "3.2 km",  dLat: -0.020, dLng:  0.024, participants: ["Presley V.", "Remington W."] },
  { id: "d11", sport: "golf",         venue: "Westside Golf Club",      time: "Mon · 10:00 AM",      players: 2,  max: 4,  distance: "5.4 km",  dLat:  0.040, dLng: -0.035, participants: ["Camden X.", "Journey Y."] },
  { id: "d12", sport: "rugby",        venue: "Northfield Rugby Ground", time: "Tomorrow · 3:00 PM",  players: 10, max: 14, distance: "3.7 km",  dLat: -0.028, dLng:  0.024, participants: ["Palmer Z.", "Ellis A.", "Bellamy B.", "Arden C.", "Bowie D.", "Callen E.", "Demi F.", "Emerald G.", "Fallon H.", "Gray I."] },
  { id: "d13", sport: "hockey",       venue: "Central Turf Pitch",      time: "Mon · 6:00 PM",       players: 8,  max: 12, distance: "2.3 km",  dLat:  0.018, dLng: -0.015, participants: ["Haven J.", "Ira K.", "Jael L.", "Kestrel M.", "Lark N.", "Mika O.", "Noel P.", "Onyx Q."] },
  { id: "d14", sport: "cricket",      venue: "Greenside Cricket Oval",  time: "Tomorrow · 1:00 PM",  players: 12, max: 22, distance: "6.1 km",  dLat:  0.050, dLng:  0.040, participants: ["Pax R.", "Quest S.", "Rain T.", "Storm U.", "Teal V.", "Uri W.", "Vale X.", "Wren Y.", "Xen Z.", "Yael A.", "Zeal B.", "Arrow C."] },
  { id: "d15", sport: "skiing",       venue: "Alpine Snow Centre",      time: "Sat · 9:00 AM",       players: 3,  max: 8,  distance: "12 km",   dLat:  0.080, dLng: -0.080, participants: ["Birch D.", "Cedar E.", "Dove F."] },
];

const MAX_AVATARS = 3;

const AVATAR_COLORS = [
  "bg-cyan-500/30 text-cyan-200 border-cyan-500/40",
  "bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-500/40",
  "bg-amber-500/30 text-amber-200 border-amber-500/40",
  "bg-emerald-500/30 text-emerald-200 border-emerald-500/40",
  "bg-violet-500/30 text-violet-200 border-violet-500/40",
];

type Accent = "emerald" | "fuchsia";

const ACCENT_THEME: Record<Accent, {
  ring: string;
  hoverBg: string;
  arrowHover: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  emerald: {
    ring:        "hover:border-emerald-400/70",
    hoverBg:     "hover:shadow-emerald-500/20",
    arrowHover:  "hover:bg-emerald-500 hover:border-emerald-400 hover:text-slate-950",
    glow:        "from-emerald-500/15 via-cyan-500/10 to-transparent",
    badgeBg:     "bg-emerald-500/15",
    badgeText:   "text-emerald-300",
    badgeBorder: "border-emerald-500/40",
  },
  fuchsia: {
    ring:        "hover:border-fuchsia-400/70",
    hoverBg:     "hover:shadow-fuchsia-500/20",
    arrowHover:  "hover:bg-fuchsia-500 hover:border-fuchsia-400 hover:text-slate-950",
    glow:        "from-fuchsia-500/15 via-violet-500/10 to-transparent",
    badgeBg:     "bg-fuchsia-500/15",
    badgeText:   "text-fuchsia-300",
    badgeBorder: "border-fuchsia-500/40",
  },
};

export type CommunityEvent = {
  id: string;
  sport: string;
  start_time: string;
  venue_name: string | null;
  status: string;
  group_size: number;
  lat?: number;
  lng?: number;
};

type Props = {
  profileSports: string[];
  baseLat?: number;
  baseLng?: number;
  communityEvents?: CommunityEvent[];
  myEvents?: CommunityEvent[];
};

export default function DiscoverEvents({ profileSports, baseLat, baseLng, communityEvents = [], myEvents = [] }: Props) {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [mapOpen, setMapOpen] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "ok" | "denied">("idle");

  function request(id: string) {
    setRequested((prev) => new Set(prev).add(id));
  }

  // Use stored coords if present; otherwise ask the browser for live location.
  const lat = liveCoords?.lat ?? baseLat;
  const lng = liveCoords?.lng ?? baseLng;
  const hasCoords = lat !== undefined && lng !== undefined;

  const askGeo = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { timeout: 8000, maximumAge: 60_000, enableHighAccuracy: false }
    );
  };

  // Auto-request once on mount if we don't already have stored coordinates.
  useEffect(() => {
    if (baseLat !== undefined && baseLng !== undefined) {
      setLocStatus("ok");
      return;
    }
    askGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reverse-geocode to get the city name for the headline.
  useEffect(() => {
    if (!hasCoords) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    const ctrl = new AbortController();
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        const place = data?.features?.[0]?.text as string | undefined;
        if (place) setCity(place);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [hasCoords, lat, lng]);

  const forYou = DEMO_EVENTS.filter((e) => profileSports.includes(e.sport)).slice(0, 6);
  const tryNew = DEMO_EVENTS.filter((e) => !profileSports.includes(e.sport)).slice(0, 5);

  if (forYou.length === 0 && tryNew.length === 0) return null;

  const allVisible = [...forYou, ...tryNew];

  const demoPins: MapPin[] = hasCoords
    ? allVisible.map((ev) => ({
        id:    ev.id,
        sport: ev.sport,
        venue: ev.venue,
        lat:   lat! + ev.dLat,
        lng:   lng! + ev.dLng,
      }))
    : [];

  const communityPins: MapPin[] = communityEvents
    .filter((e) => e.lat !== undefined && e.lng !== undefined)
    .map((e) => ({
      id:      `c-${e.id}`,
      sport:   e.sport,
      venue:   e.venue_name ?? "Community event",
      lat:     e.lat!,
      lng:     e.lng!,
      pinType: "community" as const,
    }));

  const myPins: MapPin[] = myEvents
    .filter((e) => e.lat !== undefined && e.lng !== undefined)
    .map((e) => ({
      id:      `m-${e.id}`,
      sport:   e.sport,
      venue:   e.venue_name ?? "My event",
      lat:     e.lat!,
      lng:     e.lng!,
      pinType: "mine" as const,
    }));

  const pins = [...myPins, ...communityPins, ...demoPins];

  const centerLat = lat ?? 44.4268;
  const centerLng = lng ?? 26.1025;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-black text-2xl sm:text-3xl bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
            Discover Events
          </h2>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
            <span>
              <span className="text-emerald-300 font-semibold">{allVisible.length}</span> events
            </span>
            {locStatus === "locating" && (
              <span className="text-cyan-300/80 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                Locating you…
              </span>
            )}
            {locStatus === "ok" && city && (
              <span className="text-cyan-300/90">
                near <span className="font-semibold">{city}</span>
              </span>
            )}
            {locStatus === "ok" && !city && hasCoords && (
              <span className="text-cyan-300/90">near your location</span>
            )}
            {locStatus === "denied" && (
              <button
                onClick={askGeo}
                className="text-amber-300 hover:text-amber-200 underline underline-offset-2"
              >
                Enable location to personalize
              </button>
            )}
          </p>
        </div>
        <button
          onClick={() => setMapOpen((v) => !v)}
          className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full border transition-all duration-300 active:scale-95 self-start sm:self-auto ${
            mapOpen
              ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30"
              : "bg-slate-800/70 text-slate-200 border-slate-700/60 hover:border-emerald-400/60 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10"
          }`}
        >
          <span className="text-base">🗺️</span>
          {mapOpen ? "Hide map" : "View map"}
        </button>
      </div>

      {/* Map */}
      {mapOpen && (
        <div className="space-y-2 card-rise">
          <EventsMapView
            key={`${centerLat.toFixed(4)}-${centerLng.toFixed(4)}`}
            pins={pins}
            centerLat={centerLat}
            centerLng={centerLng}
            userLat={hasCoords ? lat : undefined}
            userLng={hasCoords ? lng : undefined}
          />
          {!hasCoords && (
            <p className="text-xs text-slate-500 text-center">
              Allow location access (or set your availability on the Today page) to see events near you.
            </p>
          )}
        </div>
      )}

      {/* Community Events (real, created by other users) */}
      {communityEvents.length > 0 && (
        <Carousel
          title="From the Community"
          tagline="Created by other players"
          accent="emerald"
        >
          {communityEvents.map((ev, i) => (
            <CommunityCard key={ev.id} ev={ev} index={i} />
          ))}
        </Carousel>
      )}

      {/* For You */}
      {forYou.length > 0 && (
        <Carousel
          title="For You"
          tagline="Matches your sports"
          accent="emerald"
        >
          {forYou.map((ev, i) => (
            <EventCard
              key={ev.id}
              ev={ev}
              joined={requested.has(ev.id)}
              onJoin={() => request(ev.id)}
              accent="emerald"
              index={i}
            />
          ))}
        </Carousel>
      )}

      {/* Try Something New */}
      {tryNew.length > 0 && (
        <Carousel
          title="Try Something New"
          tagline="Step outside your comfort zone"
          accent="fuchsia"
        >
          {tryNew.map((ev, i) => (
            <EventCard
              key={ev.id}
              ev={ev}
              joined={requested.has(ev.id)}
              onJoin={() => request(ev.id)}
              accent="fuchsia"
              index={i}
              muted
            />
          ))}
        </Carousel>
      )}
    </div>
  );
}

function Carousel({
  title,
  tagline,
  accent,
  children,
}: {
  title: string;
  tagline: string;
  accent: Accent;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const theme = ACCENT_THEME[accent];

  function update() {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <span
          className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
        >
          {tagline}
        </span>
      </div>

      <div className="relative -mx-5 sm:-mx-8">
        {/* Left fade */}
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-linear-to-r from-slate-950 via-slate-950/80 to-transparent z-10 transition-opacity duration-300 ${
            canLeft ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Right fade */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-linear-to-l from-slate-950 via-slate-950/80 to-transparent z-10 transition-opacity duration-300 ${
            canRight ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Left arrow */}
        <button
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 backdrop-blur border-2 border-slate-700 text-white text-2xl font-bold flex items-center justify-center transition-all duration-300 active:scale-90 shadow-xl shadow-black/50 ${theme.arrowHover} ${
            canLeft ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
          }`}
        >
          <span className="-mt-0.5">‹</span>
        </button>

        {/* Right arrow */}
        <button
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 backdrop-blur border-2 border-slate-700 text-white text-2xl font-bold flex items-center justify-center transition-all duration-300 active:scale-90 shadow-xl shadow-black/50 ${theme.arrowHover} ${
            canRight ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"
          }`}
        >
          <span className="-mt-0.5">›</span>
        </button>

        {/* Track */}
        <div
          ref={ref}
          onScroll={update}
          className="no-scrollbar flex gap-4 sm:gap-5 overflow-x-auto px-5 sm:px-8 py-3 scroll-smooth snap-x snap-mandatory"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function CommunityCard({ ev, index }: { ev: CommunityEvent; index: number }) {
  const emoji  = SPORT_EMOJI[ev.sport as Sport] ?? "🏅";
  const start  = new Date(ev.start_time);
  const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <Link
      href={`/events/${ev.id}`}
      className="card-rise group shrink-0 w-72 snap-start rounded-2xl bg-linear-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/70 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 overflow-hidden flex flex-col relative"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-linear-to-br from-emerald-500/15 via-cyan-500/10 to-transparent blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="p-5 flex flex-col gap-4 flex-1 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none drop-shadow-lg">{emoji}</span>
            <div>
              <p className="text-white font-bold capitalize leading-tight text-base">
                {ev.sport.replace("_", " ")}
              </p>
              <p className="text-emerald-300/80 text-xs font-medium">{dateStr} · {timeStr}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 rounded-full px-2 py-0.5 shrink-0 capitalize">
            {ev.status}
          </span>
        </div>

        {ev.venue_name && (
          <div className="border-l-2 border-slate-700/60 pl-3">
            <p className="text-white text-sm font-semibold truncate">📍 {ev.venue_name}</p>
          </div>
        )}

        <div className="text-slate-400 text-xs">
          {ev.group_size} player slots
        </div>

        <div className="mt-auto pt-1">
          <span className="block w-full text-center text-sm font-bold py-2.5 rounded-xl border bg-slate-800 border-emerald-500/30 text-emerald-300 group-hover:bg-linear-to-r group-hover:from-emerald-500 group-hover:to-cyan-500 group-hover:text-slate-950 group-hover:border-emerald-400 transition-all duration-200">
            View event →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EventCard({
  ev,
  joined,
  onJoin,
  accent,
  index,
  muted = false,
}: {
  ev: DemoEvent;
  joined: boolean;
  onJoin: () => void;
  accent: Accent;
  index: number;
  muted?: boolean;
}) {
  const emoji     = SPORT_EMOJI[ev.sport as Sport] ?? "🏅";
  const spotsLeft = ev.max - ev.players;
  const isFull    = spotsLeft <= 0;
  const urgent    = spotsLeft === 1;
  const extra     = ev.participants.length > MAX_AVATARS ? ev.participants.length - MAX_AVATARS : 0;
  const shown     = ev.participants.slice(0, MAX_AVATARS);
  const fillPct   = Math.round((ev.players / ev.max) * 100);
  const theme     = ACCENT_THEME[accent];

  return (
    <div
      className={`card-rise group shrink-0 w-72 snap-start rounded-2xl bg-linear-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 border border-slate-700/60 ${theme.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${theme.hoverBg} overflow-hidden flex flex-col relative`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Decorative gradient glow */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-linear-to-br ${theme.glow} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
      />

      <div className="p-5 flex flex-col gap-4 flex-1 relative">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`absolute inset-0 bg-linear-to-br ${theme.glow} rounded-full blur-lg opacity-70`} />
              <span className="text-4xl leading-none relative drop-shadow-lg">{emoji}</span>
            </div>
            <div>
              <p className="text-white font-bold capitalize leading-tight text-base">
                {ev.sport.replace("_", " ")}
              </p>
              <p className="text-cyan-300/80 text-xs font-medium">{ev.distance} away</p>
            </div>
          </div>
          {urgent && !isFull && (
            <span className="text-amber-300 text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 rounded-full px-2 py-0.5 animate-pulse shrink-0 shadow-lg shadow-amber-500/20">
              1 left!
            </span>
          )}
        </div>

        {/* Venue + time */}
        <div className="space-y-1.5 border-l-2 border-slate-700/60 pl-3">
          <p className="text-white text-sm font-semibold truncate">📍 {ev.venue}</p>
          <p className="text-slate-400 text-xs">🕒 {ev.time}</p>
        </div>

        {/* Fill bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-300 text-xs font-medium">
              {ev.players}<span className="text-slate-500">/{ev.max}</span> players
            </span>
            <span className={`text-[11px] font-bold ${
              fillPct >= 90 ? "text-red-400" : fillPct >= 60 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {fillPct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fillPct >= 90
                  ? "bg-linear-to-r from-red-500 to-rose-400"
                  : fillPct >= 60
                  ? "bg-linear-to-r from-amber-500 to-orange-400"
                  : "bg-linear-to-r from-emerald-500 to-cyan-400"
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {shown.map((name, i) => {
              const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
              return (
                <div
                  key={name}
                  title={name}
                  className={`w-7 h-7 rounded-full border text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                >
                  {initials}
                </div>
              );
            })}
            {extra > 0 && (
              <div className="w-7 h-7 rounded-full border border-slate-600 bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center ring-2 ring-slate-900">
                +{extra}
              </div>
            )}
          </div>
          <span className="text-slate-400 text-[11px] truncate">
            {ev.participants.length === 1
              ? `${ev.participants[0].split(" ")[0]} is in`
              : `${ev.participants[0].split(" ")[0]} +${ev.participants.length - 1}`}
          </span>
        </div>

        {/* Join */}
        <div className="mt-auto pt-1">
          <button
            onClick={onJoin}
            disabled={joined || isFull}
            className={`w-full text-sm font-bold py-2.5 rounded-xl border transition-all duration-200 active:scale-95 ${
              joined
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default"
                : isFull
                ? "bg-slate-700/40 border-slate-600 text-slate-500 cursor-not-allowed"
                : muted
                ? "bg-slate-800 border-fuchsia-500/30 text-fuchsia-300 hover:bg-linear-to-r hover:from-fuchsia-500 hover:to-violet-500 hover:text-white hover:border-fuchsia-400 hover:shadow-lg hover:shadow-fuchsia-500/30"
                : "bg-slate-800 border-emerald-500/30 text-emerald-300 hover:bg-linear-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-slate-950 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30"
            }`}
          >
            {joined ? "Requested ✓" : isFull ? "Full" : "Join →"}
          </button>
        </div>
      </div>
    </div>
  );
}
