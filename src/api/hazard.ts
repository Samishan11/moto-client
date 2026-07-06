import type {
  CreateHazardRequest,
  Hazard,
  MessageResponse,
  UpdateHazardRequest,
} from "@moto/contract";
import { apiFetch } from "./client";

/** Typed wrappers over the Phase 7 hazard routes (types from @moto/contract). */

export function listHazards(
  lat: number,
  lng: number,
  radius: number,
): Promise<Hazard[]> {
  const q = `?lat=${lat}&lng=${lng}&radius=${radius}`;
  return apiFetch<Hazard[]>(`/hazards${q}`, { auth: true });
}

export function reportHazard(body: CreateHazardRequest): Promise<Hazard> {
  return apiFetch<Hazard>("/hazards", { method: "POST", body, auth: true });
}

export function extendHazard(
  id: string,
  body: UpdateHazardRequest,
): Promise<Hazard> {
  return apiFetch<Hazard>(`/hazards/${id}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function deleteHazard(id: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/hazards/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
