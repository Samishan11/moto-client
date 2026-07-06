import type {
  CreatePollRequest,
  CreateStopRequest,
  CreateTripRequest,
  MessageResponse,
  Poll,
  PollResults,
  RsvpRequest,
  Trip,
  TripAttendee,
  TripDetail,
  TripStop,
  UpdateStopRequest,
  UpdateTripRequest,
  VoteRequest,
} from "@moto/contract";
import { apiFetch } from "./client";

/** Typed wrappers over the Phase 5 trip/poll routes (types from @moto/contract). */

// --- Trips ---

export function listTrips(groupId: string, upcoming = true): Promise<Trip[]> {
  return apiFetch<Trip[]>(`/groups/${groupId}/trips?upcoming=${upcoming}`, {
    auth: true,
  });
}

/** Trips across all of the user's groups (Home dashboard). */
export function listMyTrips(upcoming = true): Promise<Trip[]> {
  return apiFetch<Trip[]>(`/trips/mine?upcoming=${upcoming}`, { auth: true });
}

export function getTrip(tripId: string): Promise<TripDetail> {
  return apiFetch<TripDetail>(`/trips/${tripId}`, { auth: true });
}

export function createTrip(
  groupId: string,
  body: CreateTripRequest,
): Promise<Trip> {
  return apiFetch<Trip>(`/groups/${groupId}/trips`, {
    method: "POST",
    body,
    auth: true,
  });
}

export function updateTrip(
  tripId: string,
  body: UpdateTripRequest,
): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${tripId}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function deleteTrip(tripId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/trips/${tripId}`, {
    method: "DELETE",
    auth: true,
  });
}

// --- Stops ---

export function addStop(
  tripId: string,
  body: CreateStopRequest,
): Promise<TripStop> {
  return apiFetch<TripStop>(`/trips/${tripId}/stops`, {
    method: "POST",
    body,
    auth: true,
  });
}

export function updateStop(
  tripId: string,
  stopId: string,
  body: UpdateStopRequest,
): Promise<TripStop> {
  return apiFetch<TripStop>(`/trips/${tripId}/stops/${stopId}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function deleteStop(
  tripId: string,
  stopId: string,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/trips/${tripId}/stops/${stopId}`, {
    method: "DELETE",
    auth: true,
  });
}

/** Replace a trip's entire ordered stop list (route editing). */
export function replaceStops(
  tripId: string,
  stops: CreateStopRequest[],
): Promise<TripStop[]> {
  return apiFetch<TripStop[]>(`/trips/${tripId}/stops`, {
    method: "PUT",
    body: { stops },
    auth: true,
  });
}

// --- Attendance ---

export function listAttendees(tripId: string): Promise<TripAttendee[]> {
  return apiFetch<TripAttendee[]>(`/trips/${tripId}/attendees`, { auth: true });
}

export function setRsvp(
  tripId: string,
  body: RsvpRequest,
): Promise<TripAttendee> {
  return apiFetch<TripAttendee>(`/trips/${tripId}/rsvp`, {
    method: "POST",
    body,
    auth: true,
  });
}

// --- Polls ---

export function listPolls(tripId: string): Promise<Poll[]> {
  return apiFetch<Poll[]>(`/trips/${tripId}/polls`, { auth: true });
}

export function createPoll(
  tripId: string,
  body: CreatePollRequest,
): Promise<Poll> {
  return apiFetch<Poll>(`/trips/${tripId}/polls`, {
    method: "POST",
    body,
    auth: true,
  });
}

export function votePoll(pollId: string, body: VoteRequest): Promise<Poll> {
  return apiFetch<Poll>(`/polls/${pollId}/vote`, {
    method: "POST",
    body,
    auth: true,
  });
}

export function pollResults(pollId: string): Promise<PollResults> {
  return apiFetch<PollResults>(`/polls/${pollId}/results`, { auth: true });
}
