import { useQuery } from "@tanstack/react-query";
import type { TripStop } from "@moto/contract";
import { describeWeatherCode } from "../lib/weather";

/** Live forecast reaches ~16 days; beyond that we fall back to climatology. */
const FORECAST_MAX_DAYS = 15;
/** How many recent years to average for "typical" conditions. */
const TYPICAL_YEARS = 3;
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

/** How the numbers were derived — the UI labels this so it's never misleading. */
export type WeatherBasis = "forecast" | "typical" | "actual";

export interface StopWeather {
  basis: WeatherBasis;
  emoji: string;
  label: string;
  tempMaxC: number;
  tempMinC: number;
  /** Precipitation chance (%) — forecast, or share of recent years for typical. */
  precipProb: number | null;
  /** Precipitation amount (mm) — from archive (actual / typical avg). */
  precipMm: number | null;
  windKph: number | null;
}

interface DailyRow {
  weather_code?: (number | null)[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Local calendar date (YYYY-MM-DD) of an ISO timestamp, in the device tz. */
function localDate(iso: string): string {
  const d = new Date(iso);
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function daysUntil(iso: string): number {
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(new Date(iso)) - start(new Date())) / 86_400_000);
}

const first = (a?: (number | null)[]): number | null =>
  a && a.length ? a[0] : null;
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** Open-Meteo returns an array for many coordinates, an object for one. */
function toRows(body: unknown): DailyRow[] {
  const arr = (Array.isArray(body) ? body : [body]) as { daily?: DailyRow }[];
  return arr.map((r) => r.daily ?? {});
}

async function fetchDaily(
  base: string,
  lats: string,
  lngs: string,
  date: string,
  daily: string,
): Promise<DailyRow[]> {
  const url =
    `${base}?latitude=${lats}&longitude=${lngs}&daily=${daily}` +
    `&start_date=${date}&end_date=${date}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return toRows(await res.json());
}

/** Emoji/label from a weather code, falling back to precipitation when absent. */
function describeArchive(code: number | null, precipMm: number | null) {
  if (code != null) return describeWeatherCode(code);
  if (precipMm != null && precipMm >= 5) return { emoji: "🌧️", label: "Rain" };
  if (precipMm != null && precipMm >= 1)
    return { emoji: "🌦️", label: "Showers" };
  return { emoji: "⛅️", label: "Dry" };
}

/**
 * Weather at every stop for the trip's day — always available, honestly labelled:
 *  - `forecast`: real forecast when the ride is within ~16 days.
 *  - `typical`:  average of the same calendar day over the last few years
 *                (climatology) for rides further out — good enough to pack for.
 *  - `actual`:   recorded weather from the archive for past rides.
 *
 * All stops go in one batched request per year; `timezone=auto` keeps "the day"
 * local to each stop. Returns a map keyed by stop id.
 */
export function useRouteWeather(stops: TripStop[], scheduledAt: string) {
  const date = localDate(scheduledAt);
  const days = daysUntil(scheduledAt);
  const basis: WeatherBasis =
    days < 0 ? "actual" : days <= FORECAST_MAX_DAYS ? "forecast" : "typical";
  const ids = stops.map((s) => s.id).join(",");

  const query = useQuery({
    queryKey: ["route-weather", basis, date, ids],
    enabled: stops.length > 0,
    staleTime: basis === "forecast" ? 30 * 60_000 : 24 * 60 * 60_000,
    retry: 1,
    queryFn: async (): Promise<Record<string, StopWeather>> => {
      const lats = stops.map((s) => s.latitude).join(",");
      const lngs = stops.map((s) => s.longitude).join(",");
      const out: Record<string, StopWeather> = {};

      if (basis === "forecast") {
        const rows = await fetchDaily(
          FORECAST_URL,
          lats,
          lngs,
          date,
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        );
        stops.forEach((s, i) => {
          const d = rows[i] ?? {};
          const code = first(d.weather_code);
          const max = first(d.temperature_2m_max);
          const min = first(d.temperature_2m_min);
          if (code == null || max == null || min == null) return;
          const wind = first(d.wind_speed_10m_max);
          out[s.id] = {
            basis,
            ...describeWeatherCode(code),
            tempMaxC: Math.round(max),
            tempMinC: Math.round(min),
            precipProb: first(d.precipitation_probability_max),
            precipMm: null,
            windKph: wind != null ? Math.round(wind) : null,
          };
        });
        return out;
      }

      if (basis === "actual") {
        const rows = await fetchDaily(
          ARCHIVE_URL,
          lats,
          lngs,
          date,
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        );
        stops.forEach((s, i) => {
          const d = rows[i] ?? {};
          const max = first(d.temperature_2m_max);
          const min = first(d.temperature_2m_min);
          if (max == null || min == null) return;
          const precip = first(d.precipitation_sum);
          const wind = first(d.wind_speed_10m_max);
          out[s.id] = {
            basis,
            ...describeArchive(first(d.weather_code), precip),
            tempMaxC: Math.round(max),
            tempMinC: Math.round(min),
            precipProb: null,
            precipMm: precip != null ? Math.round(precip) : null,
            windKph: wind != null ? Math.round(wind) : null,
          };
        });
        return out;
      }

      // typical: average the same month/day across the last few years.
      const [, mm, dd] = date.split("-").map(Number);
      const thisYear = new Date().getFullYear();
      const perYear = await Promise.all(
        Array.from({ length: TYPICAL_YEARS }, (_, k) =>
          fetchDaily(
            ARCHIVE_URL,
            lats,
            lngs,
            ymd(thisYear - (k + 1), mm, dd),
            "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
          ),
        ),
      );

      stops.forEach((s, i) => {
        const maxes: number[] = [];
        const mins: number[] = [];
        const precs: number[] = [];
        const winds: number[] = [];
        for (const rows of perYear) {
          const d = rows[i] ?? {};
          const mx = first(d.temperature_2m_max);
          const mn = first(d.temperature_2m_min);
          const pr = first(d.precipitation_sum);
          const wd = first(d.wind_speed_10m_max);
          if (mx != null) maxes.push(mx);
          if (mn != null) mins.push(mn);
          if (pr != null) precs.push(pr);
          if (wd != null) winds.push(wd);
        }
        if (!maxes.length || !mins.length) return;
        const rainyYears = precs.filter((p) => p >= 1).length;
        const em =
          rainyYears >= 2
            ? { emoji: "🌧️", label: "Often wet" }
            : rainyYears === 1
              ? { emoji: "🌦️", label: "Rain possible" }
              : { emoji: "⛅️", label: "Usually dry" };
        out[s.id] = {
          basis: "typical",
          ...em,
          tempMaxC: Math.round(avg(maxes)),
          tempMinC: Math.round(avg(mins)),
          precipProb: precs.length
            ? Math.round((rainyYears / precs.length) * 100)
            : null,
          precipMm: precs.length ? Math.round(avg(precs)) : null,
          windKph: winds.length ? Math.round(avg(winds)) : null,
        };
      });
      return out;
    },
  });

  return { ...query, basis };
}
