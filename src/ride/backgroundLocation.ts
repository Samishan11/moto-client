import { AppState } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import * as SecureStore from "expo-secure-store";
import { ApiError, apiFetch } from "../api/client";

/**
 * Background ride tracking. The foreground path (useRideLocation → socket)
 * stops the moment the rider locks their phone — which is exactly what riders
 * do while riding — and they'd vanish from the group map. This task keeps
 * reporting while the app is backgrounded, uploading over REST (a suspended
 * app can't reliably hold a socket; the server fans the point out to the
 * group room either way).
 *
 * Needs a dev build: background location doesn't run in Expo Go. There,
 * `startBackgroundRideTracking` fails gracefully and the app behaves as
 * before (foreground-only).
 */

const TASK = "moto-ride-background-location";
/** Persisted so a headless OS relaunch of the task still knows the ride. */
const RIDE_KEY = "moto.bg.rideId";

let activeRideId: string | null = null;

async function currentRideId(): Promise<string | null> {
  if (activeRideId) return activeRideId;
  try {
    activeRideId = await SecureStore.getItemAsync(RIDE_KEY);
  } catch {
    activeRideId = null;
  }
  return activeRideId;
}

/** Errors that mean "this ride is over for us" — stop tracking, don't retry. */
const TERMINAL_CODES = new Set([
  "RIDE_ALREADY_COMPLETED",
  "RIDE_NOT_FOUND",
  "RIDE_FORBIDDEN",
]);

// Module scope on purpose: the task must exist when the OS launches the app
// headless (no React tree). index.ts imports this file for exactly that.
TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error) return;
  const locations =
    (data as { locations?: Location.LocationObject[] })?.locations ?? [];
  await uploadLatest(locations);
});

async function uploadLatest(
  locations: Location.LocationObject[],
): Promise<void> {
  const latest = locations[locations.length - 1];
  if (!latest) return;
  // While the app is active the 1Hz foreground watcher owns reporting; the
  // task would only double-send the same positions.
  if (AppState.currentState === "active") return;

  const rideId = await currentRideId();
  if (!rideId) return;

  let battery: number | null = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    battery = level >= 0 ? Math.round(level * 100) : null;
  } catch {
    battery = null;
  }

  const heading = latest.coords.heading;
  try {
    await apiFetch(`/rides/${rideId}/location`, {
      method: "POST",
      auth: true,
      body: {
        lat: latest.coords.latitude,
        lng: latest.coords.longitude,
        speed:
          latest.coords.speed != null
            ? Math.min(500, Math.max(0, latest.coords.speed * 3.6))
            : null,
        heading:
          heading != null && heading >= 0 ? Math.min(360, heading) : null,
        accuracy: latest.coords.accuracy ?? null,
        battery,
      },
    });
  } catch (err) {
    if (err instanceof ApiError && TERMINAL_CODES.has(err.code)) {
      // Ride ended (or we lost access) while backgrounded — shut down rather
      // than ping a dead ride until the user reopens the app.
      await stopBackgroundRideTracking();
    }
    // Anything else (offline, timeout, expired session in a headless launch)
    // is dropped; the next fix retries naturally.
  }
}

/**
 * Start background updates for a ride. Returns false when unavailable
 * (permission denied, Expo Go, missing native module) — callers just keep
 * the foreground-only behavior.
 */
export async function startBackgroundRideTracking(
  rideId: string,
): Promise<boolean> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== "granted") return false;
    // Android 11+ sends the user to settings for "Allow all the time";
    // iOS shows the always-allow upgrade prompt.
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== "granted") return false;

    activeRideId = rideId;
    await SecureStore.setItemAsync(RIDE_KEY, rideId);

    if (await Location.hasStartedLocationUpdatesAsync(TASK)) return true;
    await Location.startLocationUpdatesAsync(TASK, {
      // Coarser than the foreground watcher on purpose: background points
      // keep the marker alive, they don't need 1Hz fidelity — battery wins.
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5_000,
      distanceInterval: 25,
      deferredUpdatesInterval: 10_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Moto — live ride",
        notificationBody: "Sharing your location with your ride group.",
        notificationColor: "#FF5A1F",
      },
    });
    return true;
  } catch (err) {
    console.warn(
      "[bgLocation] unavailable:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Stop background updates and forget the ride (idempotent). */
export async function stopBackgroundRideTracking(): Promise<void> {
  activeRideId = null;
  try {
    await SecureStore.deleteItemAsync(RIDE_KEY);
  } catch {
    // best-effort
  }
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) {
      await Location.stopLocationUpdatesAsync(TASK);
    }
  } catch {
    // task never registered (Expo Go) — nothing to stop
  }
}
