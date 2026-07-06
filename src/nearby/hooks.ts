import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { nearbyRidersQueryOptions, queryKeys } from "../api/queries";
import { queryClient } from "../api/queryClient";
import {
  connectChatSocket,
  emitPresenceLocation,
  emitPresenceStop,
  subscribePresence,
} from "../chat/socket";

/** Radius for the global nearby map (matches the server default). */
export const NEARBY_RADIUS_M = 10_000;
/** Drop riders not heard from in this long (mirrors the server-side TTL). */
const STALE_MS = 3 * 60 * 1000;
/** Uplink cadence while the map is open. */
const EMIT_INTERVAL_MS = 4000;
/** Reject GPS fixes with a worse accuracy radius (same policy as live ride). */
const MAX_ACCURACY_M = 35;
/** At most one snapshot refetch per this window when unknown riders appear. */
const UNKNOWN_REFETCH_MS = 10_000;

export interface SelfPosition {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
}

function toReading(loc: Location.LocationObject): SelfPosition {
  const heading = loc.coords.heading;
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    // iOS reports -1 when the heading is unknown — that's "no heading".
    heading: heading != null && heading >= 0 ? Math.min(360, heading) : null,
    speed: loc.coords.speed != null ? Math.min(500, Math.max(0, loc.coords.speed * 3.6)) : null,
  };
}

export interface LiveNearbyRider {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  lastSeenMs: number;
}

/** Great-circle distance in meters (client-side, for HUD labels). */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Watch the device GPS and broadcast presence while the nearby map is open.
 *
 * Resilience rules:
 * - Emits are connection-guarded (never queued), so a reconnect can't flood the
 *   server with a backlog of stale positions — the next tick sends a fresh one.
 * - Low-confidence fixes still update `self` (the local UI needs *a* position)
 *   but are never broadcast, so the marker can't jump to a bad read for others.
 * - On unmount we send an explicit `presence:stop`; if the network is down at
 *   that moment the server-side TTL still expires the entry. Belt and braces.
 */
export function usePresenceBroadcast(): {
  self: SelfPosition | null;
  permission: "granted" | "denied" | "pending";
} {
  const [permission, setPermission] = useState<
    "granted" | "denied" | "pending"
  >("pending");
  const [self, setSelf] = useState<SelfPosition | null>(null);
  const lastEmit = useRef(0);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    connectChatSocket();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setPermission("denied");
        return;
      }
      setPermission("granted");

      // Seed from the OS cache so the UI (pickup point, map anchor) has a
      // position immediately instead of waiting for the first fresh fix.
      const last = await Location.getLastKnownPositionAsync();
      if (cancelled) return;
      if (last) setSelf(toReading(last));

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (loc) => {
          const reading = toReading(loc);
          // Our own position accepts any fix — a coarse pickup point beats
          // being stuck on "waiting for location" indoors/on wifi-only GPS.
          setSelf(reading);

          // But only broadcast high-confidence fixes, so our marker can't
          // jump to a bad read on other riders' maps.
          if (
            loc.coords.accuracy != null &&
            loc.coords.accuracy > MAX_ACCURACY_M
          )
            return;

          const now = Date.now();
          if (now - lastEmit.current < EMIT_INTERVAL_MS) return;
          // Only advance the throttle clock when the emit actually went out, so
          // the first tick after a reconnect publishes immediately.
          if (emitPresenceLocation(reading)) lastEmit.current = now;
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      emitPresenceStop();
    };
  }, []);

  return { self, permission };
}

/**
 * Live nearby riders = REST snapshot (identity + position) reconciled with
 * socket deltas (movement), keyed by userId.
 *
 * Correctness rules:
 * - Timestamps win: a snapshot row never overwrites a newer socket delta and
 *   vice versa, so out-of-order arrivals can't move a marker backwards.
 * - `presence:stop` removes immediately; a periodic sweep prunes anyone silent
 *   past the server TTL (covers riders whose stop was lost mid-network-drop).
 * - On socket reconnect the snapshot is refetched — deltas missed while offline
 *   are unrecoverable, so the REST snapshot is the recovery source of truth.
 * - A delta from a rider we don't know yet (came into range after the snapshot)
 *   renders immediately as an anonymous marker and triggers a throttled snapshot
 *   refetch to pull their name/avatar.
 */
export function useNearbyRiders(
  self: SelfPosition | null,
  selfUserId: string | undefined,
): {
  riders: LiveNearbyRider[];
  connected: boolean;
  isLoading: boolean;
} {
  const [riders, setRiders] = useState<Record<string, LiveNearbyRider>>({});
  const [connected, setConnected] = useState(false);
  const lastUnknownRefetch = useRef(0);
  // Refs so the socket subscription doesn't re-bind on every identity/GPS
  // change; handlers always read the latest values.
  const selfIdRef = useRef(selfUserId);
  selfIdRef.current = selfUserId;
  const selfRef = useRef(self);
  selfRef.current = self;

  const anchor = self ? { lat: self.lat, lng: self.lng } : null;
  const snapshot = useQuery({
    ...nearbyRidersQueryOptions(
      anchor?.lat ?? 0,
      anchor?.lng ?? 0,
      NEARBY_RADIUS_M,
    ),
    enabled: anchor != null,
  });

  // Merge the snapshot in, newest-timestamp-wins per rider.
  useEffect(() => {
    if (!snapshot.data) return;
    setRiders((prev) => {
      const next = { ...prev };
      for (const r of snapshot.data) {
        const seenMs = new Date(r.lastSeen).getTime();
        const existing = next[r.user.id];
        next[r.user.id] = {
          userId: r.user.id,
          displayName: r.user.displayName,
          avatarUrl: r.user.avatarUrl,
          // Keep the fresher position; always take identity from the snapshot.
          ...(existing && existing.lastSeenMs > seenMs
            ? {
                lat: existing.lat,
                lng: existing.lng,
                heading: existing.heading,
                speed: existing.speed,
                lastSeenMs: existing.lastSeenMs,
              }
            : {
                lat: r.lat,
                lng: r.lng,
                heading: r.heading,
                speed: r.speed,
                lastSeenMs: seenMs,
              }),
        };
      }
      return next;
    });
  }, [snapshot.data]);

  const refetchSnapshot = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.nearbyRidersRoot,
    });
  }, []);

  // Socket deltas + connection lifecycle.
  useEffect(() => {
    const socket = connectChatSocket();
    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      // Missed deltas while offline are gone — resync from the snapshot.
      refetchSnapshot();
    };
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const unsub = subscribePresence(socket, {
      onUpdate: (e) => {
        // Our own pings fan back to us (we're in our own group rooms). The
        // screen renders self from local GPS — folding the echo in would show
        // a duplicate, stale marker and count us in "nearby riders".
        if (e.userId === selfIdRef.current) return;
        // The socket fans out by mutual group, not by distance — the REST
        // snapshot is radius-filtered but deltas would add a group member on
        // the other side of the country to the "nearby" list. Filter here,
        // and drop a known rider who moved out of range. Without a GPS fix
        // yet we can't measure, so accept and let the sweep reconcile.
        const me = selfRef.current;
        if (me && distanceM(me, { lat: e.lat, lng: e.lng }) > NEARBY_RADIUS_M) {
          setRiders((prev) => {
            if (!(e.userId in prev)) return prev;
            const next = { ...prev };
            delete next[e.userId];
            return next;
          });
          return;
        }
        const at = new Date(e.at).getTime();
        setRiders((prev) => {
          const existing = prev[e.userId];
          if (existing && existing.lastSeenMs >= at) return prev; // stale/out-of-order
          if (!existing) {
            // New rider mid-session: show them now, fetch identity soon.
            const now = Date.now();
            if (now - lastUnknownRefetch.current > UNKNOWN_REFETCH_MS) {
              lastUnknownRefetch.current = now;
              refetchSnapshot();
            }
          }
          return {
            ...prev,
            [e.userId]: {
              userId: e.userId,
              displayName: existing?.displayName ?? null,
              avatarUrl: existing?.avatarUrl ?? null,
              lat: e.lat,
              lng: e.lng,
              heading: e.heading,
              speed: e.speed,
              lastSeenMs: at,
            },
          };
        });
      },
      onStop: (e) => {
        setRiders((prev) => {
          if (!(e.userId in prev)) return prev;
          const next = { ...prev };
          delete next[e.userId];
          return next;
        });
      },
    });

    // Sweep riders whose pings stopped without a stop event (network drop),
    // plus anyone now beyond the radius (either of us moved).
    const sweep = setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      const me = selfRef.current;
      setRiders((prev) => {
        const ids = Object.keys(prev).filter(
          (id) =>
            prev[id].lastSeenMs < cutoff ||
            (me != null && distanceM(me, prev[id]) > NEARBY_RADIUS_M),
        );
        if (ids.length === 0) return prev;
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
    }, 30_000);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      unsub();
      clearInterval(sweep);
    };
  }, [refetchSnapshot]);

  return {
    riders: Object.values(riders),
    connected,
    isLoading: snapshot.isLoading && anchor != null,
  };
}
