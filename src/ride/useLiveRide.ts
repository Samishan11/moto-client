import { useEffect, useRef, useState } from 'react';
import type { RideDetail, RideStatus } from '@samishan11/moto-contract';
import { connectChatSocket, joinGroupRoom, subscribeRide } from '../chat/socket';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

/** Live position + last speed/heading/battery for one rider. */
export interface LivePos {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  battery: number | null;
}

/** Internal: position + when it was reported, for ordering and staleness. */
interface TimedPos extends LivePos {
  atMs: number;
}

/** A rider is "stale" (grayed out) when silent for this long — they broadcast
 * every ~4s, so a minute of silence means backgrounded app / lost signal. */
const STALE_MS = 60_000;
/** How often the stale set is re-evaluated. */
const STALE_SWEEP_MS = 15_000;

interface Options {
  ride: RideDetail;
  /** The signed-in user's id, so their own GPS folds into `positions`. */
  selfUserId: string | undefined;
  /** Latest local GPS reading — shown instantly, before the server echoes it. */
  self: LivePos | null;
  /** Fired once when the server broadcasts that the ride completed. */
  onCompleted?: () => void;
}

/**
 * Owns the real-time state for a live ride: it joins the group room, reconciles
 * every relevant socket event into a `positions` map keyed by userId, and keeps
 * the cached roster in sync so a rider who joins mid-ride shows up with their
 * real name, color and in the rider count (not a fallback "R" marker).
 *
 * Correctness rules (mirrors the nearby-riders hook):
 * - Positions are seeded from each participant's `lastLocation`, so a viewer
 *   opening mid-ride sees every marker instantly instead of waiting for each
 *   rider's next broadcast.
 * - Timestamps win: a seed never overwrites a fresher socket delta and vice
 *   versa, so out-of-order arrivals can't move a marker backwards.
 * - Our own server echo is ignored — local GPS owns the self marker.
 * - `staleIds` flags riders silent past STALE_MS so the map can gray them out
 *   rather than showing a frozen marker as live.
 */
export function useLiveRide({ ride, selfUserId, self, onCompleted }: Options): {
  positions: Record<string, LivePos>;
  status: RideStatus;
  /** Rider ids whose last report is older than STALE_MS. */
  staleIds: Set<string>;
} {
  const { id: rideId, groupId } = ride;
  const [positions, setPositions] = useState<Record<string, TimedPos>>({});
  const [status, setStatus] = useState<RideStatus>(ride.status);
  const [sweepAt, setSweepAt] = useState(() => Date.now());

  const completedRef = useRef(onCompleted);
  completedRef.current = onCompleted;
  const selfIdRef = useRef(selfUserId);
  selfIdRef.current = selfUserId;

  // Seed / refresh markers from the roster's last known positions.
  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of ride.participants) {
        const loc = p.lastLocation;
        if (!loc) continue;
        if (p.user.id === selfIdRef.current) continue; // local GPS owns self
        const atMs = new Date(loc.at).getTime();
        const existing = next[p.user.id];
        if (existing && existing.atMs >= atMs) continue; // keep the fresher fix
        next[p.user.id] = {
          lat: loc.lat,
          lng: loc.lng,
          speed: loc.speed,
          heading: loc.heading,
          battery: loc.battery,
          atMs,
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [ride.participants]);

  useEffect(() => {
    const socket = connectChatSocket();
    joinGroupRoom(groupId);

    // A join/leave changes profiles, colors and the rider count — none of which
    // ride the location stream — so pull a fresh roster from the server.
    const refreshRoster = () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ride(rideId) });

    const unsub = subscribeRide(socket, {
      onLocation: (e) => {
        if (e.rideId !== rideId) return;
        // The server echoes our own broadcasts back (whole group room). That
        // echo is seconds staler than the local GPS fold-in below and would
        // snap our marker backwards — local GPS owns the self position.
        if (e.userId === selfIdRef.current) return;
        const atMs = new Date(e.timestamp).getTime();
        setPositions((prev) => {
          const existing = prev[e.userId];
          if (existing && existing.atMs >= atMs) return prev; // out-of-order
          return {
            ...prev,
            [e.userId]: {
              lat: e.lat,
              lng: e.lng,
              speed: e.speed,
              heading: e.heading,
              battery: e.battery,
              atMs,
            },
          };
        });
      },
      onParticipantJoined: (e) => {
        if (e.rideId !== rideId) return;
        refreshRoster();
      },
      onParticipantLeft: (e) => {
        if (e.rideId !== rideId) return;
        // Drop their marker immediately; then refresh name/color/count state.
        setPositions((prev) => {
          if (!(e.userId in prev)) return prev;
          const next = { ...prev };
          delete next[e.userId];
          return next;
        });
        refreshRoster();
      },
      onStatus: (e) => {
        if (e.rideId !== rideId) return;
        setStatus(e.status);
        if (e.status === 'COMPLETED') completedRef.current?.();
      },
    });
    return unsub;
  }, [rideId, groupId]);

  // Fold my own GPS reading in instantly (before the server echoes it back).
  useEffect(() => {
    if (self && selfUserId) {
      setPositions((prev) => ({
        ...prev,
        [selfUserId]: { ...self, atMs: Date.now() },
      }));
    }
  }, [self, selfUserId]);

  // Periodic re-evaluation so riders fade to stale without a triggering event.
  useEffect(() => {
    const iv = setInterval(() => setSweepAt(Date.now()), STALE_SWEEP_MS);
    return () => clearInterval(iv);
  }, []);

  const staleIds = new Set(
    Object.entries(positions)
      .filter(([, p]) => sweepAt - p.atMs > STALE_MS)
      .map(([id]) => id),
  );

  return { positions, status, staleIds };
}
