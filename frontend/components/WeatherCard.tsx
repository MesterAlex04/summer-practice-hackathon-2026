"use client";

export type WeatherSnapshot = {
  temperature: number;
  weatherCode: number;
  precipitationProbability: number | null;
  windKmh: number | null;
};

const WEATHER_DESCRIPTIONS: Record<number, { label: string; emoji: string }> = {
  0:  { label: "Clear sky",          emoji: "☀️" },
  1:  { label: "Mainly clear",       emoji: "🌤️" },
  2:  { label: "Partly cloudy",      emoji: "⛅" },
  3:  { label: "Overcast",           emoji: "☁️" },
  45: { label: "Foggy",              emoji: "🌫️" },
  48: { label: "Foggy",              emoji: "🌫️" },
  51: { label: "Light drizzle",      emoji: "🌦️" },
  53: { label: "Drizzle",            emoji: "🌦️" },
  55: { label: "Heavy drizzle",      emoji: "🌧️" },
  61: { label: "Light rain",         emoji: "🌧️" },
  63: { label: "Rain",               emoji: "🌧️" },
  65: { label: "Heavy rain",         emoji: "🌧️" },
  71: { label: "Light snow",         emoji: "🌨️" },
  73: { label: "Snow",               emoji: "🌨️" },
  75: { label: "Heavy snow",         emoji: "❄️" },
  77: { label: "Snow grains",        emoji: "🌨️" },
  80: { label: "Rain showers",       emoji: "🌦️" },
  81: { label: "Heavy showers",      emoji: "🌧️" },
  82: { label: "Violent showers",    emoji: "⛈️" },
  85: { label: "Snow showers",       emoji: "🌨️" },
  86: { label: "Heavy snow showers", emoji: "❄️" },
  95: { label: "Thunderstorm",       emoji: "⛈️" },
  96: { label: "Storm w/ hail",      emoji: "⛈️" },
  99: { label: "Storm w/ hail",      emoji: "⛈️" },
};

function describe(code: number) {
  return WEATHER_DESCRIPTIONS[code] ?? { label: "—", emoji: "🌡️" };
}

function recommendation(code: number, precip: number | null) {
  if (code >= 95) return { tone: "danger",  text: "Thunderstorm expected — consider rescheduling." };
  if (code >= 80 || (precip !== null && precip > 70)) return { tone: "warn", text: "Likely rain — bring backup or move indoors." };
  if (code >= 71 && code <= 86) return { tone: "warn", text: "Snow expected — dress warm." };
  if (code >= 61) return { tone: "warn", text: "Rain forecast — pack a jacket." };
  if (code >= 45 && code <= 48) return { tone: "info", text: "Fog forecast — visibility may be low." };
  if (code <= 2) return { tone: "good", text: "Conditions look great. Show up and move." };
  return { tone: "info", text: "Conditions should be playable." };
}

const TONE: Record<string, string> = {
  good:   "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  info:   "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  warn:   "text-amber-300 bg-amber-500/10 border-amber-500/30",
  danger: "text-red-300 bg-red-500/10 border-red-500/30",
};

type Props = { weather: WeatherSnapshot | null };

export default function WeatherCard({ weather }: Props) {
  if (!weather) return null;
  const { label, emoji } = describe(weather.weatherCode);
  const rec = recommendation(weather.weatherCode, weather.precipitationProbability);

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Weather forecast</p>
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-2xl leading-tight">
            {Math.round(weather.temperature)}°C
          </p>
          <p className="text-slate-300 text-sm">{label}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-400 shrink-0">
          {weather.precipitationProbability !== null && (
            <span>💧 {weather.precipitationProbability}%</span>
          )}
          {weather.windKmh !== null && (
            <span>💨 {Math.round(weather.windKmh)} km/h</span>
          )}
        </div>
      </div>
      <p className={`text-xs font-medium px-3 py-2 rounded-lg border ${TONE[rec.tone]}`}>
        {rec.text}
      </p>
    </div>
  );
}
