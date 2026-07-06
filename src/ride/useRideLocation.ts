import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { connectChatSocket, emitRideLocation } from '../chat/socket';
import {
  startBackgroundRideTracking,
  stopBackgroundRideTracking,
} from './backgroundLocation';

/**
 * Don't BROADCAST fixes whose reported accuracy radius is worse than this
 * (meters) — a coarse network/cell fix would plant our marker tens of meters
 * off on everyone else's map. A good open-sky GNSS fix is ~3-8m. Local-only
 * display accepts any fix: seeing yourself coarsely beats not at all.
 */
const MAX_ACCURACY_M = 35;

interface Options {
  /**
   * Watch the device GPS while true — drives the caller's own marker so they
   * see themselves on the map even before joining/while the ride is paused.
   */
  watch: boolean;
  /**
   * Emit positions to the group while true (you're riding + the ride is live).
   * Independent of `watch`: we can show you locally without broadcasting.
   */
  broadcast: boolean;
  rideId: string;
}

interface LiveSelf {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  battery: number | null;
}

function toReading(loc: Location.LocationObject): LiveSelf {
  const heading = loc.coords.heading;
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    // Clamp into the contract's bounds: the server drops out-of-range points.
    speed: loc.coords.speed != null ? Math.min(500, Math.max(0, loc.coords.speed * 3.6)) : null,
    // iOS reports -1 when the heading is unknown — that's "no heading".
    heading: heading != null && heading >= 0 ? Math.min(360, heading) : null,
    battery: null,
  };
}

/**
 * Watches the device GPS and emits `ride:location` over the socket every ~4s
 * while `active`. Also returns the latest local reading so the map can show the
 * rider's own marker instantly (before the server echoes it back).
 *
 * Returns `permission: 'denied'` if the user rejects location access, so the
 * screen can prompt. expo-location needs a dev build for background updates, but
 * foreground `watchPositionAsync` works in Expo Go.
 */
export function useRideLocation({ watch, broadcast, rideId }: Options): {
  self: LiveSelf | null;
  permission: 'granted' | 'denied' | 'pending';
  /** Background tracking: 'denied' means the rider vanishes on screen lock. */
  background: 'inactive' | 'active' | 'denied';
} {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [background, setBackground] = useState<'inactive' | 'active' | 'denied'>('inactive');
  const [self, setSelf] = useState<LiveSelf | null>(null);
  const lastEmit = useRef(0);

  // Read `broadcast` through a ref so toggling it (join / pause) gates emitting
  // without tearing down and restarting the GPS watcher.
  const broadcastRef = useRef(broadcast);
  broadcastRef.current = broadcast;

  useEffect(() => {
    if (!watch) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');

      // Seed from the OS cache so the rider sees themselves immediately
      // instead of waiting for the first fresh fix (never broadcast the seed).
      const last = await Location.getLastKnownPositionAsync();
      if (cancelled) return;
      if (last) setSelf(toReading(last));

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // refresh the local marker up to 1x/sec
          distanceInterval: 0, // report every fix — no 5m spatial quantization
        },
        async (loc) => {
          // Any fix updates the local marker — indoors/urban accuracy is often
          // worse than the broadcast gate, and no marker at all is worse.
          const reading = toReading(loc);
          setSelf(reading);

          // Never broadcast low-confidence fixes: our marker would jump to a
          // bad reading on everyone else's map.
          if (loc.coords.accuracy != null && loc.coords.accuracy > MAX_ACCURACY_M) return;

          // Only push to the group when actively broadcasting; we still track
          // `self` above so the local marker updates regardless.
          if (!broadcastRef.current) return;

          // Throttle uplink to ~4s (server also dedups within 1s).
          const now = Date.now();
          if (now - lastEmit.current < 4000) return;
          lastEmit.current = now;

          let battery: number | null = null;
          try {
            const level = await Battery.getBatteryLevelAsync();
            battery = level >= 0 ? Math.round(level * 100) : null;
          } catch {
            battery = null;
          }

          connectChatSocket();
          emitRideLocation({
            rideId,
            lat: reading.lat,
            lng: reading.lng,
            speed: reading.speed,
            heading: reading.heading,
            accuracy: loc.coords.accuracy ?? null,
            battery,
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [watch, rideId]);

  // Background tracking follows the broadcast state: riding + live ride →
  // keep reporting with the screen off; pause/leave/end → stop (and drop the
  // Android foreground-service notification). Requires a dev build + "allow
  // all the time" permission; otherwise it declines and we stay
  // foreground-only, exactly the previous behavior.
  useEffect(() => {
    if (!broadcast || permission !== 'granted') {
      setBackground('inactive');
      return;
    }
    let cancelled = false;
    void startBackgroundRideTracking(rideId).then((ok) => {
      if (!cancelled) setBackground(ok ? 'active' : 'denied');
    });
    return () => {
      cancelled = true;
      setBackground('inactive');
      void stopBackgroundRideTracking();
    };
  }, [broadcast, permission, rideId]);

  return { self, permission, background };
}
