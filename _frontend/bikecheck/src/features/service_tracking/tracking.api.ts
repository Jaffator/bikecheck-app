// Service Tracking API requests.
import { apiFetch } from "@/api/client";
import type { GarageTrackedAction, PostponeTrackedActionInput, TrackedAction } from "./tracking.types";

// Every Tracked Action on one bike, worst first — the quiet ones included.
export async function getBikeTrackedActions(bikeId: number): Promise<TrackedAction[]> {
  const query = new URLSearchParams({ bikeId: String(bikeId) });
  return apiFetch<TrackedAction[]>(`/service-tracking/tracked-actions?${query.toString()}`);
}

// Everything across the owner's bikes that has come at least this far, worst first.
export async function getGarageTrackedActions(minPercentage: number): Promise<GarageTrackedAction[]> {
  const query = new URLSearchParams({ minPercentage: String(minPercentage) });
  return apiFetch<GarageTrackedAction[]>(`/service-tracking/attention?${query.toString()}`);
}

// Put one Tracked Action off, which grants it an Extension. The row comes back as it now
// reads, with the Extension already in its interval.
export async function postponeTrackedAction(input: PostponeTrackedActionInput): Promise<TrackedAction> {
  return apiFetch<TrackedAction>("/service-tracking/postpone", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
