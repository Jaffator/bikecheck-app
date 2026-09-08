// Service Tracking API requests.
import { apiFetch } from "@/api/client";
import type { TrackedAction } from "./tracking.types";

// Every Tracked Action on one bike, worst first — the quiet ones included.
export async function getBikeTrackedActions(bikeId: number): Promise<TrackedAction[]> {
  const query = new URLSearchParams({ bikeId: String(bikeId) });
  return apiFetch<TrackedAction[]>(`/service-tracking/tracked-actions?${query.toString()}`);
}
