"use client";

import { useActionState, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SPORT_OPTIONS, SPORT_EMOJI, type Sport } from "@/lib/sports";
import { createEvent, type CreateEventState } from "./actions";

const EventLocationPicker = dynamic(() => import("@/components/EventLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-72 md:h-96 w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse flex items-center justify-center">
      <span className="text-slate-500 text-sm">Loading map…</span>
    </div>
  ),
});

const initial: CreateEventState = { status: "idle" };

const FALLBACK_LAT = 44.4268;
const FALLBACK_LNG = 26.1025;

type Props = {
  initialLat?: number;
  initialLng?: number;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function defaultStart(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEnd(): string {
  const d = new Date();
  d.setHours(d.getHours() + 4, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateEventForm({ initialLat, initialLng }: Props) {
  const [state, formAction, pending] = useActionState(createEvent, initial);

  const [sport, setSport] = useState<Sport>("tennis");
  const [groupSize, setGroupSize] = useState(4);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat ?? FALLBACK_LAT,
    lng: initialLng ?? FALLBACK_LNG,
  });
  const [hasGeo, setHasGeo] = useState(initialLat !== undefined && initialLng !== undefined);

  // Ask for live location only if we don't already have a stored one.
  useEffect(() => {
    if (hasGeo) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setHasGeo(true);
      },
      () => {},
      { timeout: 8000, maximumAge: 60_000 }
    );
  }, [hasGeo]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Sport */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white">Sport</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SPORT_OPTIONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSport(s)}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium capitalize transition-all duration-200 active:scale-95 ${
                sport === s
                  ? "bg-linear-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-400/60 text-emerald-200 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="text-2xl leading-none">{SPORT_EMOJI[s]}</span>
              <span className="leading-tight">{s.replace("_", " ")}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="sport" value={sport} />
      </div>

      {/* Date / time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="start_time" className="text-sm font-semibold text-white">Start</label>
          <input
            id="start_time"
            name="start_time"
            type="datetime-local"
            required
            defaultValue={defaultStart()}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="end_time" className="text-sm font-semibold text-white">End</label>
          <input
            id="end_time"
            name="end_time"
            type="datetime-local"
            required
            defaultValue={defaultEnd()}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
      </div>

      {/* Venue name + group size */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="venue_name" className="text-sm font-semibold text-white">
            Venue name <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="venue_name"
            name="venue_name"
            type="text"
            placeholder="e.g. Millennium Sports Park"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="group_size" className="text-sm font-semibold text-white">
            Group size <span className="text-emerald-300">{groupSize}</span>
          </label>
          <input
            id="group_size"
            name="group_size"
            type="range"
            min={2}
            max={22}
            value={groupSize}
            onChange={(e) => setGroupSize(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-400"
          />
        </div>
      </div>

      {/* Map picker */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white">
          Pick the venue location on the map
        </label>
        <EventLocationPicker
          initialLat={coords.lat}
          initialLng={coords.lng}
          onChange={(lat, lng) => setCoords({ lat, lng })}
        />
        <input type="hidden" name="lat" value={coords.lat} />
        <input type="hidden" name="lng" value={coords.lng} />
      </div>

      {/* Error message */}
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5">
          ⚠️ {state.message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full text-base font-bold py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] bg-linear-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Creating…" : "Create event →"}
      </button>
    </form>
  );
}
