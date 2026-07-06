import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { describeWeatherCode } from "../lib/weather";

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * One-shot current location for the Home dashboard (weather + nearby hazards).
 * Non-intrusive: it only reads an already-granted permission or asks once, and
 * resolves to `null` if denied — callers hide their location-dependent sections
 * rather than nagging.
 */
export function useCurrentLocation(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === "undetermined") {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }
      if (cancelled || status !== "granted") return;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled)
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        /* location unavailable — leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}

export interface Weather {
  tempC: number;
  emoji: string;
  label: string;
}

/**
 * Current conditions from Open-Meteo (keyless, free). Cached 10 min; failures
 * are swallowed so the card simply shows nothing rather than blocking Home.
 */
export function useWeather(coords: Coords | null) {
  return useQuery({
    queryKey: ["weather", coords?.lat ?? 0, coords?.lng ?? 0],
    enabled: coords != null,
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async (): Promise<Weather | null> => {
      const { lat, lng } = coords!;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const body = (await res.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
      };
      const temp = body.current?.temperature_2m;
      const code = body.current?.weather_code;
      if (temp == null || code == null) return null;
      return { tempC: Math.round(temp), ...describeWeatherCode(code) };
    },
  });
}
