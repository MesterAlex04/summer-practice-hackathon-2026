"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";
import type { VenueResult } from "@/app/events/[id]/actions";
import { joinEvent } from "@/app/events/[id]/actions";
import EventChat from "./EventChat";
import EventPolls, { type Poll } from "./EventPolls";
import WeatherCard, { type WeatherSnapshot } from "./WeatherCard";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse flex items-center justify-center">
      <span className="text-slate-500 text-sm">Loading map…</span>
    </div>
  ),
});

type Participant = {
  user_id: string;
  role: "captain" | "player";
  rsvp_status: "invited" | "accepted" | "declined";
  profiles: { display_name: string; photo_url: string | null } | null;
};

type Props = {
  id: string;
  sport: string;
  captainId: string;
  currentUserId: string;
  startTime: string;
  endTime: string;
  groupSize: number;
  status: string;
  venue: VenueResult;
  centroidLat?: number;
  centroidLng?: number;
  participants: Participant[];
  weather: WeatherSnapshot | null;
  polls: Poll[];
};

const STATUS_STYLES: Record<string, string> = {
  forming:   "text-amber-400 bg-amber-500/15 border-amber-500/30",
  confirmed: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  completed: "text-slate-400 bg-slate-700/60 border-slate-600",
  cancelled: "text-red-400 bg-red-500/15 border-red-500/30",
};

const RSVP_COLOR: Record<string, string> = {
  invited:  "bg-amber-400",
  accepted: "bg-emerald-400",
  declined: "bg-red-400",
};

export function EventDetail({
  id,
  sport,
  captainId,
  currentUserId,
  startTime,
  endTime,
  groupSize,
  status,
  venue,
  centroidLat,
  centroidLng,
  participants,
  weather,
  polls,
}: Props) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");

  const emoji      = SPORT_EMOJI[sport as Sport] ?? "🏅";
  const start      = new Date(startTime);
  const end        = new Date(endTime);
  const isCapt     = captainId === currentUserId;
  const isParticipant = participants.some((p) => p.user_id === currentUserId);
  const mapLat     = venue?.lat ?? centroidLat;
  const mapLng     = venue?.lng ?? centroidLng;
  const statusClass = STATUS_STYLES[status] ?? STATUS_STYLES.forming;

  function downloadCalendar() {
    const ics = buildIcs({
      uid:      `event-${id}@showup2move`,
      title:    `${sport.charAt(0).toUpperCase() + sport.slice(1).replace("_", " ")} — ShowUp2Move`,
      start,
      end,
      location: venue?.name
        ? `${venue.name}${venue.address ? `, ${venue.address}` : ""}`
        : "ShowUp2Move event",
      description: `Group sport activity organized via ShowUp2Move.`,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href      = url;
    a.download  = `showup2move-${sport}-${start.toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function shareEvent() {
    if (typeof window === "undefined") return;
    const url   = `${window.location.origin}/events/${id}`;
    const title = `${sport} on ShowUp2Move`;
    const text  = `Join me for ${sport} on ${start.toLocaleDateString()}!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      // clipboard blocked — open native prompt as last resort
      window.prompt("Copy this link:", url);
    }
  }

  async function handleJoin() {
    setJoining(true);
    setJoinError(null);
    const result = await joinEvent(id);
    if (result.error) {
      setJoinError(result.error);
      setJoining(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-5 pt-6 pb-2">
        <Link href="/" className="text-white font-bold text-base tracking-tight">
          ShowUp<span className="text-emerald-400">2</span>Move
        </Link>
        <Link
          href="/events"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5"
        >
          ← Events
        </Link>
      </header>

      <main className="relative px-5 py-4 max-w-lg mx-auto space-y-4 pb-14">

        {/* Sport title + status */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-5xl leading-none">{emoji}</span>
            <div>
              <h1 className="text-2xl font-black text-white capitalize">
                {sport.replace("_", " ")}
              </h1>
              <p className="text-slate-400 text-sm">
                {groupSize} players ·{" "}
                {isCapt ? <span className="text-amber-400">You&apos;re the captain 👑</span> : "You&apos;re in"}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize shrink-0 ${statusClass}`}>
            {status}
          </span>
        </div>

        {/* Time window */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">When</p>
          <p className="text-white font-semibold">
            {start.toLocaleDateString("en-US", {
              weekday: "long",
              month:   "long",
              day:     "numeric",
            })}
          </p>
          <p className="text-slate-300 text-sm">
            {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Calendar export + Share */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={downloadCalendar}
            className="text-sm font-semibold py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
          >
            📅 Add to calendar
          </button>
          <button
            onClick={shareEvent}
            className="text-sm font-semibold py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300 transition-all flex items-center justify-center gap-2"
          >
            {shareStatus === "copied" ? "✅ Copied!" : "🔗 Share"}
          </button>
        </div>

        {/* Weather forecast */}
        <WeatherCard weather={weather} />

        {/* Map + venue card */}
        {mapLat !== undefined && mapLng !== undefined && (
          <div className="space-y-3">
            <MapView lat={mapLat} lng={mapLng} venueName={venue?.name} />

            {venue ? (
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Venue</p>
                <p className="text-white font-semibold">{venue.name}</p>
                {venue.address && (
                  <p className="text-slate-400 text-sm">{venue.address}</p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-1">
                No nearby venue found — meet at the pin 📍
              </p>
            )}
          </div>
        )}

        {/* Participant list */}
        <div className="space-y-3 pt-1">
          <h2 className="text-white font-bold">
            Squad <span className="text-slate-500 font-normal">({participants.length})</span>
          </h2>

          <div className="space-y-2">
            {participants.map((p) => {
              const name     = p.profiles?.display_name ?? "Unknown";
              const initials = name.slice(0, 2).toUpperCase();
              const isMe     = p.user_id === currentUserId;
              const dotColor = RSVP_COLOR[p.rsvp_status] ?? "bg-slate-400";

              return (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-300 text-xs font-bold">{initials}</span>
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {name}{" "}
                      {isMe && <span className="text-slate-400 font-normal text-xs">(you)</span>}
                    </p>
                    <p className="text-slate-500 text-xs capitalize">{p.role}</p>
                  </div>

                  {/* Captain crown */}
                  {p.role === "captain" && (
                    <span className="text-base shrink-0">👑</span>
                  )}

                  {/* RSVP indicator dot */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}
                    title={p.rsvp_status}
                  />
                </div>
              );
            })}
          </div>

          {/* RSVP legend */}
          <div className="flex items-center gap-4 pt-1 px-1">
            {[
              { label: "Invited",  color: "bg-amber-400" },
              { label: "Accepted", color: "bg-emerald-400" },
              { label: "Declined", color: "bg-red-400" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-slate-500 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Join event — shown only to non-participants on open events */}
        {!isParticipant && (status === "forming" || status === "confirmed") && (
          <div className="space-y-2 pt-1">
            {joinError && (
              <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5">
                ⚠️ {joinError}
              </p>
            )}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full text-base font-bold py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] bg-linear-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {joining ? "Joining…" : "Join this event →"}
            </button>
          </div>
        )}

        {/* Polls / voting */}
        <div className="pt-1">
          <EventPolls
            eventId={id}
            currentUserId={currentUserId}
            isCaptain={isCapt}
            polls={polls}
          />
        </div>

        {/* Group chat */}
        <div className="space-y-3 pt-1">
          <h2 className="text-white font-bold">Group Chat</h2>
          <EventChat
            eventId={id}
            currentUserId={currentUserId}
            participants={participants}
          />
        </div>

      </main>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildIcs({
  uid,
  title,
  start,
  end,
  location,
  description,
}: {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
}) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShowUp2Move//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
