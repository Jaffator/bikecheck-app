// Typed Strava endpoints use the shared API client.
import { apiFetch } from "@/api/client";
import type { GearLinkingData, GearLink, PendingRide, StravaSyncResult } from "./strava.types";

export interface StravaAuthorizeUrl {
  url: string;
}

// Retrieves the backend-generated Strava authorization URL.
export async function getStravaAuthorizeUrl(): Promise<StravaAuthorizeUrl> {
  return apiFetch<StravaAuthorizeUrl>("/strava/connect");
}

// Revokes the Strava grant and clears the linked athlete.
export async function disconnectStrava(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/strava/connect", { method: "DELETE" });
}

// Retrieves Strava gear alongside BikeCheck bikes for pairing.
export async function getGearLinking(): Promise<GearLinkingData> {
  return apiFetch<GearLinkingData>("/strava/gear-linking");
}

// Writes pairings transactionally on the backend.
export async function linkStravaGear(links: GearLink[]): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/strava/gear-linking", {
    method: "PATCH",
    body: JSON.stringify({ links }),
  });
}

// GET /strava/pending-activities — rides waiting to be assigned to a bike.
export async function getPendingRides(): Promise<PendingRide[]> {
  return apiFetch<PendingRide[]>("/strava/pending-activities");
}

// Assigns a pending ride and dismisses its notification.
export async function resolvePendingRide(activityId: string, bikeId: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/strava/pending-activities/${activityId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ bikeId }),
  });
}

// Drops a pending ride for good: it never counts on any bike.
export async function dismissPendingRide(activityId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/strava/pending-activities/${activityId}/dismiss`, { method: "POST" });
}

// Queues the Strava rides the webhook missed; 429 within the cooldown.
export async function syncStrava(): Promise<StravaSyncResult> {
  return apiFetch<StravaSyncResult>("/strava/sync", { method: "POST" });
}
