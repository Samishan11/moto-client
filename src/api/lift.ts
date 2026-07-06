import type {
  CreateLiftRequest,
  LiftRequest,
  MessageResponse,
  UpdateLiftRequest,
} from "@moto/contract";
import { apiFetch } from "./client";

/** Typed wrappers over the lift routes (types from @moto/contract). */

export function listNearbyLifts(
  lat: number,
  lng: number,
  radius: number,
): Promise<LiftRequest[]> {
  return apiFetch<LiftRequest[]>(
    `/lifts/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    {
      auth: true,
    },
  );
}

export async function getMyLift(): Promise<LiftRequest | null> {
  // The API serializes a null lift as an empty 200 body, which apiFetch parses
  // to undefined — coerce to null so React Query accepts the result.
  return (
    (await apiFetch<LiftRequest | null>("/lifts/mine", { auth: true })) ?? null
  );
}

export function requestLift(body: CreateLiftRequest): Promise<LiftRequest> {
  return apiFetch<LiftRequest>("/lifts", { method: "POST", body, auth: true });
}

export function acceptLift(id: string): Promise<LiftRequest> {
  return apiFetch<LiftRequest>(`/lifts/${id}/accept`, {
    method: "POST",
    auth: true,
  });
}

/** Driver backs out of an accepted lift; it reopens for other riders. */
export function unacceptLift(id: string): Promise<LiftRequest> {
  return apiFetch<LiftRequest>(`/lifts/${id}/unaccept`, {
    method: "POST",
    auth: true,
  });
}

export function closeLift(
  id: string,
  body: UpdateLiftRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/lifts/${id}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}
