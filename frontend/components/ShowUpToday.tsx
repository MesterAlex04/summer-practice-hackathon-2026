"use client";

import { useState } from "react";
import Link from "next/link";
import { showUpToday, cancelAvailability } from "@/app/today/actions";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";

// ─── Constants ────────────────────────────────────────────────────────────────

type TimePreset = { id: string; label: string; icon: string; start: number; end: number };

const TIME_PRESETS: TimePreset[] = [
  { id: "morning",   label: "Morning",   icon: "🌅", start: 7,  end: 10 },
  { id: "lunch",     label: "Lunch",     icon: "☀️", start: 12, end: 14 },
  { id: "afternoon", label: "Afternoon", icon: "🌤️", start: 15, end: 18 },
  { id: "evening",   label: "Evening",   icon: "🌆", start: 18, end: 21 },
  { id: "night",     label: "Night",     icon: "🌙", start: 20, end: 23 },
];

function fmt(h: number) { return `${String(h).padStart(2, "0")}:00`; }

function localDate() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject(e),
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "idle" | "locating" | "configuring" | "submitting" | "confirmed" | "declined";

export type ConfirmedData = {
  sports: string[];
  timeLabel: string;
  date: string;
};

type Props = {
  displayName: string;
  profileSports: string[];
  existing: ConfirmedData | null;
};

// ─── Root Component ───────────────────────────────────────────────────────────

export function ShowUpToday({ displayName, profileSports, existing }: Props) {
  const [step, setStep] = useState<Step>(existing ? "confirmed" : "idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>(
    existing?.sports ?? (profileSports.length === 1 ? profileSports : [])
  );
  const [selectedPreset, setSelectedPreset] = useState<TimePreset | null>(null);
  const [confirmedData, setConfirmedData] = useState<ConfirmedData | null>(existing);
  const [error, setError] = useState("");

  const sportsMenu: string[] =
    profileSports.length > 0 ? profileSports : (Object.keys(SPORT_EMOJI) as Sport[]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleYes() {
    setError("");
    setStep("locating");
    try {
      const pos = await getLocation();
      setCoords({ lat: pos.latitude, lng: pos.longitude });
      setStep("configuring");
    } catch {
      setError("Location access denied. Enable location in your browser and try again.");
      setStep("idle");
    }
  }

  function toggleSport(sport: string) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  async function handleConfirm() {
    if (!coords || !selectedPreset || selectedSports.length === 0) return;
    setStep("submitting");

    const today = new Date();
    const date = localDate();
    const start = new Date(today);
    start.setHours(selectedPreset.start, 0, 0, 0);
    const end = new Date(today);
    end.setHours(selectedPreset.end, 0, 0, 0);

    const result = await showUpToday({
      lat: coords.lat,
      lng: coords.lng,
      sports: selectedSports,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      date,
    });

    if (result.success) {
      setConfirmedData({
        sports: selectedSports,
        timeLabel: `${selectedPreset.icon} ${selectedPreset.label} · ${fmt(selectedPreset.start)}–${fmt(selectedPreset.end)}`,
        date,
      });
      setStep("confirmed");
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
      setStep("configuring");
    }
  }

  async function handleCancel() {
    if (!confirmedData) return;
    const result = await cancelAvailability(confirmedData.date);
    if (result.success) {
      setConfirmedData(null);
      setSelectedSports(profileSports.length === 1 ? profileSports : []);
      setSelectedPreset(null);
      setStep("idle");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-5 pt-6 pb-2">
        <Link href="/" className="text-white font-bold text-base tracking-tight">
          ShowUp<span className="text-emerald-400">2</span>Move
        </Link>
        <Link
          href="/profile"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5"
        >
          ✏️ Profile
        </Link>
      </header>

      {/* Main */}
      <main className="relative flex-1 flex flex-col px-5 pb-10">
        {step === "idle" && (
          <IdleView
            name={displayName.split(" ")[0] || displayName}
            onYes={handleYes}
            onNo={() => setStep("declined")}
            error={error}
            noSports={profileSports.length === 0}
          />
        )}

        {step === "locating" && <LocatingView />}

        {(step === "configuring" || step === "submitting") && (
          <ConfiguringView
            sportsMenu={sportsMenu}
            selectedSports={selectedSports}
            onToggle={toggleSport}
            presets={TIME_PRESETS}
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            onConfirm={handleConfirm}
            onBack={() => setStep("idle")}
            submitting={step === "submitting"}
            error={error}
            canConfirm={selectedSports.length > 0 && selectedPreset !== null}
          />
        )}

        {step === "confirmed" && confirmedData && (
          <ConfirmedView
            data={confirmedData}
            onEdit={() => setStep("configuring")}
            onCancel={handleCancel}
          />
        )}

        {step === "declined" && <DeclinedView onUndo={() => setStep("idle")} />}
      </main>
    </div>
  );
}

// ─── Idle View ────────────────────────────────────────────────────────────────

function IdleView({
  name,
  onYes,
  onNo,
  error,
  noSports,
}: {
  name: string;
  onYes: () => void;
  onNo: () => void;
  error: string;
  noSports: boolean;
}) {
  const day = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 text-center py-12">
      {/* Date + greeting */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-[0.2em]">{day}</p>
        <h1 className="text-4xl font-black text-white leading-tight">
          Hey {name}! 👋
        </h1>
        <p className="text-slate-300 text-lg">Are you showing up today?</p>
      </div>

      {/* Pulsing YES button */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-64 h-64 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />
        <div className="absolute w-56 h-56 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
        <button
          onClick={onYes}
          className="relative w-52 h-52 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all duration-200 shadow-[0_0_80px_rgba(16,185,129,0.45)] hover:shadow-[0_0_100px_rgba(16,185,129,0.65)] flex flex-col items-center justify-center gap-2 select-none"
        >
          <span className="text-6xl">✅</span>
          <span className="text-slate-950 font-black text-2xl leading-none">YES!</span>
          <span className="text-slate-950/70 font-semibold text-sm">I&apos;m in today</span>
        </button>
      </div>

      {/* No + warnings */}
      <div className="space-y-4">
        <button
          onClick={onNo}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors py-2 px-8 rounded-full border border-slate-800 hover:border-slate-600"
        >
          Not today — skip
        </button>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 max-w-xs">
            {error}
          </p>
        )}

        {noSports && (
          <p className="text-xs text-amber-400/70 max-w-xs leading-relaxed">
            You haven&apos;t set your sports yet.{" "}
            <Link href="/profile" className="underline underline-offset-2 hover:text-amber-300 transition-colors">
              Set up your profile
            </Link>{" "}
            for better matching.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Locating View ────────────────────────────────────────────────────────────

function LocatingView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
        <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-4xl">📍</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-white font-semibold text-lg">Getting your location…</p>
        <p className="text-slate-400 text-sm">This helps us find nearby players</p>
      </div>
    </div>
  );
}

// ─── Configuring View ─────────────────────────────────────────────────────────

function ConfiguringView({
  sportsMenu,
  selectedSports,
  onToggle,
  presets,
  selectedPreset,
  onSelectPreset,
  onConfirm,
  onBack,
  submitting,
  error,
  canConfirm,
}: {
  sportsMenu: string[];
  selectedSports: string[];
  onToggle: (s: string) => void;
  presets: TimePreset[];
  selectedPreset: TimePreset | null;
  onSelectPreset: (p: TimePreset) => void;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
  canConfirm: boolean;
}) {
  return (
    <div className="flex flex-col gap-8 pt-6 pb-4">
      {/* Section: Sport */}
      <section className="space-y-3">
        <SectionLabel icon="🏅" text="What are you up for?" />
        <div className="flex flex-wrap gap-2">
          {sportsMenu.map((sport) => {
            const active = selectedSports.includes(sport);
            const emoji = SPORT_EMOJI[sport as Sport] ?? "🏅";
            return (
              <button
                key={sport}
                onClick={() => onToggle(sport)}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold border transition-all duration-150 active:scale-95 select-none ${
                  active
                    ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700/80"
                }`}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="capitalize">{sport.replace("_", " ")}</span>
              </button>
            );
          })}
        </div>
        {selectedSports.length === 0 && (
          <p className="text-xs text-slate-500">Pick at least one sport</p>
        )}
      </section>

      {/* Section: Time window */}
      <section className="space-y-3">
        <SectionLabel icon="🕐" text="When are you free?" />
        <div className="grid grid-cols-2 gap-2.5">
          {presets.map((p) => {
            const active = selectedPreset?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p)}
                className={`flex flex-col items-start gap-0.5 rounded-2xl px-4 py-3.5 border transition-all duration-150 active:scale-95 select-none ${
                  active
                    ? "bg-emerald-500/15 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-700/60"
                }`}
              >
                <span className="text-xl leading-none">{p.icon}</span>
                <span className={`font-semibold text-sm mt-1 ${active ? "text-emerald-300" : "text-white"}`}>
                  {p.label}
                </span>
                <span className="text-xs text-slate-400">
                  {fmt(p.start)} – {fmt(p.end)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onConfirm}
          disabled={!canConfirm || submitting}
          className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 font-bold text-slate-950 text-lg shadow-[0_0_30px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 select-none"
        >
          {submitting ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            <span>🎉 I&apos;m In!</span>
          )}
        </button>
        <button
          onClick={onBack}
          disabled={submitting}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors py-2"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Confirmed View ───────────────────────────────────────────────────────────

function ConfirmedView({
  data,
  onEdit,
  onCancel,
}: {
  data: ConfirmedData;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center py-12">
      {/* Success badge */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
        <div className="relative w-28 h-28 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
          <span className="text-5xl">🎉</span>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">You&apos;re in!</h2>
        <p className="text-slate-400 text-base">We&apos;ll find you a group and notify you when it forms.</p>
      </div>

      {/* Details card */}
      <div className="w-full max-w-sm rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Today&apos;s sports</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {data.sports.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-sm font-semibold text-emerald-300"
              >
                <span>{SPORT_EMOJI[s as Sport] ?? "🏅"}</span>
                <span className="capitalize">{s.replace("_", " ")}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Time window</p>
          <p className="text-white font-semibold">{data.timeLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onEdit}
          className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors border border-emerald-500/30 hover:border-emerald-400/50 rounded-full px-5 py-2"
        >
          ✏️ Edit
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel for today
        </button>
      </div>
    </div>
  );
}

// ─── Declined View ────────────────────────────────────────────────────────────

function DeclinedView({ onUndo }: { onUndo: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
      <span className="text-7xl">😴</span>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">No worries!</h2>
        <p className="text-slate-400">See you next time. Stay active! 💪</p>
      </div>
      <button
        onClick={onUndo}
        className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 hover:border-emerald-400/50 rounded-full px-6 py-2.5 font-medium"
      >
        Actually… I&apos;m in! 🙋
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h2 className="text-white font-bold text-base">{text}</h2>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
