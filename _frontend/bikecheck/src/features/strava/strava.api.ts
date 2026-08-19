// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend routes are under "/strava" (see strava.controller.ts).
import { apiFetch } from "@/api/client";
import type { GearLinkingData, GearLink, PendingRide } from "./strava.types";

export interface StravaAuthorizeUrl {
  url: string;
}

// GET /strava/connect — the authorize URL to send the user to. The backend puts
// a single-use state in it, so the URL cannot be built on the client.
export async function getStravaAuthorizeUrl(): Promise<StravaAuthorizeUrl> {
  return apiFetch<StravaAuthorizeUrl>("/strava/connect");
}

// DELETE /strava/connect — unlinks the account. The backend revokes the grant
// with Strava and clears strava_athlete_id on the user.
export async function disconnectStrava(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/strava/connect", { method: "DELETE" });
}

// GET /strava/gear-linking — the user's Strava gear alongside their BikeCheck
// bikes, so the two can be paired.
export async function getGearLinking(): Promise<GearLinkingData> {
  return apiFetch<GearLinkingData>("/strava/gear-linking");
}

// PATCH /strava/gear-linking — writes the pairings. All or nothing: the backend
// rolls the whole batch back if any bike does not belong to the user.
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

// GET /strava/pending-activities/:activityId — one of them, by Strava id.
export async function getPendingRide(activityId: string): Promise<PendingRide> {
  return apiFetch<PendingRide>(`/strava/pending-activities/${activityId}`);
}

// POST /strava/pending-activities/:activityId/resolve — assigns the ride to a
// bike, which also dismisses the notification that asked about it.
export async function resolvePendingRide(
  activityId: string,
  bikeId: number,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/strava/pending-activities/${activityId}/resolve`,
    { method: "POST", body: JSON.stringify({ bikeId }) },
  );
}
