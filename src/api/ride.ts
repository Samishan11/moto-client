import type {
  LocationRequest,
  MessageResponse,
  Ride,
  RideDetail,
  RideParticipant,
  RideStats,
  RideTrack,
  StartRideRequest,
  UpdateRideStatusRequest,
} from '@moto/contract';
import { apiFetch } from './client';

/** Typed wrappers over the Phase 6 live-ride routes (types from @moto/contract). */

// --- Lifecycle ---

export function startRide(groupId: string, body: StartRideRequest): Promise<Ride> {
  return apiFetch<Ride>(`/groups/${groupId}/rides`, { method: 'POST', body, auth: true });
}

export async function getActiveRide(groupId: string): Promise<Ride | null> {
  // No active ride → the API returns `null`, which serializes to an empty body;
  // apiFetch parses that as `undefined`. Coerce to `null` because React Query
  // rejects an `undefined` query result ("Query data cannot be undefined").
  const ride = await apiFetch<Ride | null>(`/groups/${groupId}/rides/active`, { auth: true });
  return ride ?? null;
}

export function getRide(rideId: string): Promise<RideDetail> {
  return apiFetch<RideDetail>(`/rides/${rideId}`, { auth: true });
}

export function updateRideStatus(
  rideId: string,
  body: UpdateRideStatusRequest,
): Promise<Ride> {
  return apiFetch<Ride>(`/rides/${rideId}`, { method: 'PATCH', body, auth: true });
}

export function deleteRide(rideId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/rides/${rideId}`, { method: 'DELETE', auth: true });
}

// --- Participants ---

export function listRideParticipants(rideId: string): Promise<RideParticipant[]> {
  return apiFetch<RideParticipant[]>(`/rides/${rideId}/participants`, { auth: true });
}

export function joinRide(rideId: string): Promise<RideParticipant> {
  return apiFetch<RideParticipant>(`/rides/${rideId}/join`, { method: 'POST', auth: true });
}

export function leaveRide(rideId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/rides/${rideId}/leave`, { method: 'POST', auth: true });
}

// --- Location (REST fallback; socket is primary) ---

export function postLocation(rideId: string, body: LocationRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/rides/${rideId}/location`, {
    method: 'POST',
    body,
    auth: true,
  });
}

// --- Track & stats ---

export function getRideTrack(rideId: string, userId?: string): Promise<RideTrack> {
  const q = userId ? `?userId=${userId}` : '';
  return apiFetch<RideTrack>(`/rides/${rideId}/track${q}`, { auth: true });
}

export function getRideStats(rideId: string): Promise<RideStats> {
  return apiFetch<RideStats>(`/rides/${rideId}/stats`, { auth: true });
}
