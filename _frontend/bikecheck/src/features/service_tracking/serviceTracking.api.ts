// Service Tracking requests. Every figure is derived by the server on read, so there is
// nothing here to write back.
import { apiFetch } from "@/api/client";
import type { TrackedAction } from "./serviceTracking.types";

// GET /service-tracking/bike/:bikeId — every Tracked Action of one bike, worst first.
export async function getBikeTrackedActions(bikeId: number): Promise<TrackedAction[]> {
  return apiFetch<TrackedAction[]>(`/service-tracking/bike/${String(bikeId)}`);
}
