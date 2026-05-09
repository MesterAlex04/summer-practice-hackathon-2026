import type { WeatherSnapshot } from "@/components/WeatherCard";

// Open-Meteo provides hourly forecasts up to 16 days out, no API key required.
// We fetch the hour matching the event start time and return a simple snapshot.
export async function fetchWeatherForEvent(
  lat: number,
  lng: number,
  startTime: Date
): Promise<WeatherSnapshot | null> {
  const now      = new Date();
  const daysOut  = Math.floor((startTime.getTime() - now.getTime()) / 86_400_000);
  // Open-Meteo only supports up to ~16 days; bail out for events further away.
  if (daysOut < -1 || daysOut > 14) return null;

  const dateStr = startTime.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const url     = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude",  String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability,wind_speed_10m");
  url.searchParams.set("start_date", dateStr);
  url.searchParams.set("end_date",   dateStr);
  url.searchParams.set("timezone",   "UTC");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 }, // cache 30 min
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      hourly?: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
        precipitation_probability: (number | null)[];
        wind_speed_10m: number[];
      };
    };

    const hourly = data.hourly;
    if (!hourly?.time?.length) return null;

    // Match the hour bucket of the event start (UTC)
    const targetHour = `${dateStr}T${String(startTime.getUTCHours()).padStart(2, "0")}:00`;
    let idx = hourly.time.findIndex((t) => t.startsWith(targetHour));
    if (idx === -1) idx = 0;

    return {
      temperature:              hourly.temperature_2m[idx],
      weatherCode:              hourly.weather_code[idx],
      precipitationProbability: hourly.precipitation_probability?.[idx] ?? null,
      windKmh:                  hourly.wind_speed_10m?.[idx] ?? null,
    };
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return null;
  }
}
