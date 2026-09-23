// Service Tracking API requests.
import { apiFetch } from "@/api/client";
import type {
  GarageTrackedAction,
  PostponeTrackedActionInput,
  SetTrackedActionIntervalInput,
  SetTrackedActionNotifyInput,
  TrackedAction,
} from "./tracking.types";

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

// Set the owner's own Service Interval, or clear it with null. The row comes back reading
// against whatever now applies, so nothing has to be refetched to show the change.
export async function setTrackedActionInterval(input: SetTrackedActionIntervalInput): Promise<TrackedAction> {
  return apiFetch<TrackedAction>("/service-tracking/interval", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Turn this pairing's announcements on or off. The reading itself is untouched.
export async function setTrackedActionNotify(input: SetTrackedActionNotifyInput): Promise<TrackedAction> {
  return apiFetch<TrackedAction>("/service-tracking/notify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Put one Tracked Action off. Nothing about the reading changes — it simply leaves the
// dashboard until it crosses into the next band.
export async function postponeTrackedAction(input: PostponeTrackedActionInput): Promise<TrackedAction> {
  return apiFetch<TrackedAction>("/service-tracking/postpone", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
