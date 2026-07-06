import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CreateHazardRequest, Hazard } from "@moto/contract";
import { deleteHazard, reportHazard } from "../api/hazard";
import { hazardsQueryOptions, queryKeys } from "../api/queries";
import { queryClient } from "../api/queryClient";
import {
  connectChatSocket,
  joinHazardRoom,
  subscribeHazards,
} from "../chat/socket";

/** Default area radius fetched around the rider (10km). */
export const HAZARD_RADIUS_M = 10_000;

/** Remove a hazard from every area cache (idempotent by id). */
function dropFromCache(id: string): void {
  queryClient.setQueriesData<Hazard[]>(
    { queryKey: queryKeys.hazardsRoot },
    (prev) => (prev ? prev.filter((h) => h.id !== id) : prev),
  );
}

/** Nearby hazards for a live position; disabled until we have a fix. */
export function useNearbyHazards(
  lat: number | null,
  lng: number | null,
  radius = HAZARD_RADIUS_M,
) {
  return useQuery({
    ...hazardsQueryOptions(lat ?? 0, lng ?? 0, radius),
    enabled: lat != null && lng != null,
  });
}

/**
 * Report a hazard. It's an infrequent action, so we invalidate the hazard
 * caches on success (correctness over cleverness) rather than reconstruct the
 * area key the reporter can't see; the server echo + refetch reconcile it.
 */
export function useReportHazard() {
  return useMutation({
    mutationFn: (body: CreateHazardRequest) => reportHazard(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.hazardsRoot }),
  });
}

/**
 * Delete a hazard with an optimistic removal across every area cache, rolling
 * back the exact snapshots on error. `onSettled` invalidation is the safety net.
 */
export function useDeleteHazard() {
  return useMutation({
    mutationFn: (id: string) => deleteHazard(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.hazardsRoot });
      const snapshots = queryClient.getQueriesData<Hazard[]>({
        queryKey: queryKeys.hazardsRoot,
      });
      dropFromCache(id);
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.hazardsRoot }),
  });
}

/**
 * Keep the hazard caches live while a map/ride screen is mounted: join the
 * hazard room and reconcile pushed events. `hazard:expired` removes by id
 * (targeted, no refetch); `hazard:new` is intentionally a minimal payload, so
 * we refetch the (rarely-changing) area list rather than insert a partial.
 */
export function useHazardSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const socket = connectChatSocket();
    joinHazardRoom();
    // Room membership dies with the server-side socket on a reconnect (only
    // group rooms are auto-rejoined) — re-join or hazard events silently stop.
    const rejoin = () => joinHazardRoom();
    socket.on("connect", rejoin);
    const unsub = subscribeHazards(socket, {
      onNew: () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.hazardsRoot }),
      onExpired: (e) => dropFromCache(e.hazardId),
    });
    return () => {
      socket.off("connect", rejoin);
      unsub();
    };
  }, [enabled]);
}
