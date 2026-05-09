"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";
import type { MapPin } from "./EventsMapView";

const EventsMapView = dynamic(() => import("./EventsMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse flex items-center justify-center">
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
  // offsets in degrees from user's base location
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

// Limit shown names in avatar stack
const MAX_AVATARS = 4;

const AVATAR_COLORS = [
  "bg-blue-500/30 text-blue-300 border-blue-500/40",
  "bg-purple-500/30 text-purple-300 border-purple-500/40",
  "bg-rose-500/30 text-rose-300 border-rose-500/40",
  "bg-amber-500/30 text-amber-300 border-amber-500/40",
  "bg-cyan-500/30 text-cyan-300 border-cyan-500/40",
];

type Props = {
  profileSports: string[];
  baseLat?: number;
  baseLng?: number;
};

export default function DiscoverEvents({ profileSports, baseLat, baseLng }: Props) {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"list" | "map">("list");

  function request(id: string) {
    setRequested((prev) => new Set(prev).add(id));
  }

  const forYou = DEMO_EVENTS.filter((e) => profileSports.includes(e.sport)).slice(0, 5);
  const tryNew = DEMO_EVENTS.filter((e) => !profileSports.includes(e.sport)).slice(0, 3);

  if (forYou.length === 0 && tryNew.length === 0) return null;

  const allVisible = [...forYou, ...tryNew];

  // Build map pins (only when we have a base location)
  const hasCords = baseLat !== undefined && baseLng !== undefined;
  const pins: MapPin[] = hasCords
    ? allVisible.map((ev) => ({
        id:    ev.id,
        sport: ev.sport,
        venue: ev.venue,
        lat:   baseLat! + ev.dLat,
        lng:   baseLng! + ev.dLng,
      }))
    : [];

  const centerLat = baseLat ?? 0;
  const centerLng = baseLng ?? 0;

  return (
    <div className="space-y-6">
      {/* Section header + view toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Discover Events</h2>
        {hasCords && (
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-full p-1">
            <button
              onClick={() => setView("list")}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                view === "list"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("map")}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                view === "map"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🗺️ Map
            </button>
          </div>
        )}
      </div>

      {/* Map view */}
      {view === "map" && hasCords && (
        <EventsMapView
          pins={pins}
          centerLat={centerLat}
          centerLng={centerLng}
          userLat={baseLat}
          userLng={baseLng}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-8">
          {/* ── Events For You ── */}
          {forYou.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">For You</span>
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  Matches your sports
                </span>
              </div>
              <div className="space-y-3">
                {forYou.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    joined={requested.has(ev.id)}
                    onJoin={() => request(ev.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Try Something New ── */}
          {tryNew.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Try Something New</span>
                <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
                  Step outside your comfort zone
                </span>
              </div>
              <div className="space-y-3">
                {tryNew.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    joined={requested.has(ev.id)}
                    onJoin={() => request(ev.id)}
                    muted
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  ev,
  joined,
  onJoin,
  muted = false,
}: {
  ev: DemoEvent;
  joined: boolean;
  onJoin: () => void;
  muted?: boolean;
}) {
  const emoji     = SPORT_EMOJI[ev.sport as Sport] ?? "🏅";
  const spotsLeft = ev.max - ev.players;
  const isFull    = spotsLeft <= 0;
  const urgent    = spotsLeft === 1;
  const extra     = ev.participants.length > MAX_AVATARS ? ev.participants.length - MAX_AVATARS : 0;
  const shown     = ev.participants.slice(0, MAX_AVATARS);

  return (
    <div className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
      {/* Top row: emoji + info + join button */}
      <div className="flex items-center gap-4">
        <span className="text-3xl shrink-0">{emoji}</span>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-white font-semibold capitalize">
            {ev.sport.replace("_", " ")}
          </p>
          <p className="text-slate-400 text-sm truncate">📍 {ev.venue}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs">{ev.time}</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">{ev.distance}</span>
            <span className="text-slate-600 text-xs">·</span>
            {urgent && !isFull ? (
              <span className="text-amber-400 text-xs font-semibold animate-pulse">1 spot left!</span>
            ) : (
              <span className="text-slate-500 text-xs">
                {ev.players}/{ev.max} players
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onJoin}
          disabled={joined || isFull}
          className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition-all duration-150 active:scale-95 ${
            joined
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 cursor-default"
              : isFull
              ? "bg-slate-700/40 border-slate-600 text-slate-500 cursor-not-allowed"
              : muted
              ? "bg-slate-700/60 border-slate-600 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 hover:bg-amber-500/10"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-400"
          }`}
        >
          {joined ? "Requested ✓" : isFull ? "Full" : "Join →"}
        </button>
      </div>

      {/* Participant avatar stack */}
      <div className="flex items-center gap-2 pl-1">
        <div className="flex -space-x-2">
          {shown.map((name, i) => {
            const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
            const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div
                key={name}
                title={name}
                className={`w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-800 ${colorClass}`}
              >
                {initials}
              </div>
            );
          })}
          {extra > 0 && (
            <div className="w-6 h-6 rounded-full border border-slate-600 bg-slate-700 text-[10px] font-bold text-slate-400 flex items-center justify-center ring-2 ring-slate-800">
              +{extra}
            </div>
          )}
        </div>
        <span className="text-slate-500 text-xs">
          {ev.participants.length === 1
            ? `${ev.participants[0].split(" ")[0]} is in`
            : `${ev.participants[0].split(" ")[0]} and ${ev.participants.length - 1} others`}
        </span>
      </div>
    </div>
  );
}
