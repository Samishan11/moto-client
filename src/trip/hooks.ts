import { useMutation } from "@tanstack/react-query";
import type {
  CreatePollRequest,
  CreateStopRequest,
  CreateTripRequest,
  Poll,
  RsvpRequest,
  TripDetail,
  UpdateTripRequest,
  VoteRequest,
} from "@moto/contract";
import {
  addStop,
  createPoll,
  createTrip,
  deleteStop,
  deleteTrip,
  replaceStops,
  setRsvp,
  updateTrip,
  votePoll,
} from "../api/trip";
import { queryClient } from "../api/queryClient";
import { queryKeys } from "../api/queries";

/** Refetch trip list + detail immediately (even when unmounted) after a write. */
const invalidateTrips = (groupId: string) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.trips(groupId),
    refetchType: "all",
  });
const invalidateTrip = (tripId: string) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.trip(tripId),
    refetchType: "all",
  });

export function useCreateTrip(groupId: string) {
  return useMutation({
    mutationFn: (body: CreateTripRequest) => createTrip(groupId, body),
    onSuccess: () => invalidateTrips(groupId),
  });
}

export function useUpdateTrip(tripId: string, groupId: string) {
  return useMutation({
    mutationFn: (body: UpdateTripRequest) => updateTrip(tripId, body),
    onSuccess: () => {
      invalidateTrip(tripId);
      invalidateTrips(groupId);
    },
  });
}

export function useDeleteTrip(groupId: string) {
  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: () => invalidateTrips(groupId),
  });
}

/** Replace a trip's whole ordered stop list (route editing). */
export function useReplaceStops(tripId: string, groupId: string) {
  return useMutation({
    mutationFn: (stops: CreateStopRequest[]) => replaceStops(tripId, stops),
    onSuccess: () => {
      invalidateTrip(tripId);
      invalidateTrips(groupId);
    },
  });
}

export function useRsvp(tripId: string, groupId: string) {
  return useMutation({
    mutationFn: (body: RsvpRequest) => setRsvp(tripId, body),
    onSuccess: () => {
      invalidateTrip(tripId);
      invalidateTrips(groupId);
    },
  });
}

export function useAddStop(tripId: string) {
  return useMutation({
    mutationFn: (body: CreateStopRequest) => addStop(tripId, body),
    onSuccess: () => invalidateTrip(tripId),
  });
}

export function useDeleteStop(tripId: string) {
  return useMutation({
    mutationFn: (stopId: string) => deleteStop(tripId, stopId),
    onSuccess: () => invalidateTrip(tripId),
  });
}

export function useCreatePoll(tripId: string) {
  return useMutation({
    mutationFn: (body: CreatePollRequest) => createPoll(tripId, body),
    onSuccess: () => invalidateTrip(tripId),
  });
}

/**
 * Apply the caller's new selection to a cached poll: set `votedByMe` per option
 * and adjust `voteCount`/`totalVotes` by the delta. Mirrors the server, which
 * replaces the caller's prior votes with this selection.
 */
function applyMyVote(poll: Poll, chosenIds: string[]): Poll {
  const chosen = new Set(chosenIds);
  const options = poll.options.map((o) => {
    const nowMine = chosen.has(o.id);
    const delta = (nowMine ? 1 : 0) - (o.votedByMe ? 1 : 0);
    return {
      ...o,
      votedByMe: nowMine,
      voteCount: Math.max(0, o.voteCount + delta),
    };
  });
  return {
    ...poll,
    options,
    totalVotes: options.reduce((s, o) => s + o.voteCount, 0),
  };
}

export function useVotePoll(tripId: string) {
  return useMutation({
    mutationFn: (vars: { pollId: string; body: VoteRequest }) =>
      votePoll(vars.pollId, vars.body),
    // Optimistically reflect my vote (bars + counts move instantly); roll back on
    // error; `onSettled` refetch reconciles with the server tallies.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trip(tripId) });
      const prev = queryClient.getQueryData<TripDetail>(queryKeys.trip(tripId));
      queryClient.setQueryData<TripDetail>(queryKeys.trip(tripId), (old) =>
        old
          ? {
              ...old,
              polls: old.polls.map((p) =>
                p.id === vars.pollId ? applyMyVote(p, vars.body.optionIds) : p,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.trip(tripId), ctx.prev);
    },
    onSettled: () => invalidateTrip(tripId),
  });
}
