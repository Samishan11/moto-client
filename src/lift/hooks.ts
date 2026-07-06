import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CreateLiftRequest } from "@moto/contract";
import { acceptLift, closeLift, requestLift, unacceptLift } from "../api/lift";
import {
  myLiftQueryOptions,
  nearbyLiftsQueryOptions,
  queryKeys,
} from "../api/queries";
import { queryClient } from "../api/queryClient";
import { connectChatSocket, subscribeLifts } from "../chat/socket";
import type { SelfPosition } from "../nearby/hooks";

/** Radius for nearby lift requests (matches the server default). */
export const LIFT_RADIUS_M = 10_000;

const invalidateLifts = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.liftsRoot });

/** My own active lift (as requester), or null. */
export function useMyLift() {
  return useQuery(myLiftQueryOptions);
}

/** Open lifts from mutual-group members near me; disabled until I have a fix. */
export function useNearbyLifts(self: SelfPosition | null) {
  return useQuery({
    ...nearbyLiftsQueryOptions(self?.lat ?? 0, self?.lng ?? 0, LIFT_RADIUS_M),
    enabled: self != null,
  });
}

export function useRequestLift() {
  return useMutation({
    mutationFn: (body: CreateLiftRequest) => requestLift(body),
    onSuccess: (lift) => {
      queryClient.setQueryData(queryKeys.myLift, lift);
      invalidateLifts();
    },
  });
}

export function useAcceptLift() {
  return useMutation({
    mutationFn: (id: string) => acceptLift(id),
    onSuccess: () => invalidateLifts(),
  });
}

/** Driver backs out of a lift they accepted; it reopens for other riders. */
export function useUnacceptLift() {
  return useMutation({
    mutationFn: (id: string) => unacceptLift(id),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.myLift, null);
      invalidateLifts();
    },
  });
}

export function useCloseLift() {
  return useMutation({
    mutationFn: (vars: { id: string; status: "CANCELLED" | "COMPLETED" }) =>
      closeLift(vars.id, { status: vars.status }),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.myLift, null);
      invalidateLifts();
    },
  });
}

/**
 * Keep lift caches live while the map is open. `lift:new` and `lift:closed`
 * change the nearby list; `lift:accepted` also updates my own lift when I'm the
 * requester. All handlers just invalidate — lifts are low-frequency, so a
 * refetch is simpler and always correct (and pulls requester profiles/distance).
 */
export function useLiftSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const socket = connectChatSocket();
    return subscribeLifts(socket, {
      onNew: () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.liftsRoot }),
      onAccepted: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.liftsRoot });
        queryClient.invalidateQueries({ queryKey: queryKeys.myLift });
      },
      onClosed: () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.liftsRoot }),
    });
  }, [enabled]);
}
