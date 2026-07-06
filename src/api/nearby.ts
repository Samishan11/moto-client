import type { NearbyRider } from "@moto/contract";
import { apiFetch } from "./client";

/** Snapshot of nearby riders (mutual-group only), nearest first. */
export function listNearbyRiders(
  lat: number,
  lng: number,
  radius: number,
): Promise<NearbyRider[]> {
  const q = `?lat=${lat}&lng=${lng}&radius=${radius}`;
  return apiFetch<NearbyRider[]>(`/nearby/riders${q}`, { auth: true });
}
