import { useQuery } from '@tanstack/react-query';
import type { TripStop } from '@moto/contract';

/**
 * Reverse-geocoded place names for trip stops ("Pokhara, Gandaki") via
 * Nominatim — the same OSM service MapRoutePicker uses for forward search.
 * One query per trip, fetched sequentially to respect Nominatim's 1 req/s
 * guidance, cached indefinitely (coordinates don't move).
 */
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

interface NominatimReverse {
  display_name?: string;
  address?: Record<string, string>;
}

/** Compact "locality, region" label from a Nominatim address. */
function shortPlace(body: NominatimReverse): string | null {
  const a = body.address ?? {};
  const local = a.village || a.town || a.city || a.municipality || a.suburb || a.county;
  const region = a.state || a.province || a.country;
  if (local && region && local !== region) return `${local}, ${region}`;
  if (local) return local;
  const fallback = body.display_name?.split(',').slice(0, 2).join(',').trim();
  return fallback || null;
}

async function reversePlace(lat: number, lng: number): Promise<string | null> {
  const url =
    `${REVERSE_URL}?format=json&zoom=14&accept-language=ne,en` +
    `&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  return shortPlace((await res.json()) as NominatimReverse);
}

/** stopId → place name for every stop that reverse-geocodes successfully. */
export function useStopPlaces(stops: TripStop[]) {
  // Key on coordinates (not object identity) so refetches of the same trip hit cache.
  const coordsKey = stops
    .map((s) => `${s.id}:${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`)
    .join('|');

  return useQuery({
    queryKey: ['stop-places', coordsKey],
    enabled: stops.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const byId: Record<string, string> = {};
      for (const stop of stops) {
        try {
          const place = await reversePlace(stop.latitude, stop.longitude);
          if (place) byId[stop.id] = place;
        } catch {
          // Leave this stop without a place label; the UI degrades gracefully.
        }
      }
      return byId;
    },
  });
}
