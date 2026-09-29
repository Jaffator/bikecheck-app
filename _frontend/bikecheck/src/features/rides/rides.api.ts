// Ride API calls use the shared client.
import { apiFetch } from "@/api/client";
import type { Ride, RideCheckIn, RidePage } from "./rides.types";
import type { RideFilter } from "./ridesTable";

// The rides the phone's check-in drawer offers; empty unless a ride arrived since it last opened.
export async function getCheckInPrompt(): Promise<Ride[]> {
  return apiFetch<Ride[]>("/rides/check-in-prompt");
}

export async function markCheckInPromptSeen(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/rides/check-in-prompt/seen", { method: "POST" });
}

// Saving again overwrites the ride's one check-in.
export async function saveRideCheckIn(rideId: number, checkIn: RideCheckIn): Promise<RideCheckIn> {
  return apiFetch<RideCheckIn>(`/rides/${rideId}/check-in`, { method: "PUT", body: JSON.stringify(checkIn) });
}

export async function deleteRideCheckIn(rideId: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/rides/${rideId}/check-in`, { method: "DELETE" });
}

// One page of the desktop table: its rides, their weeks and the filter's figures.
export async function getFilteredRides(limit: number, offset: number, filter: RideFilter): Promise<RidePage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), tz: riderTimeZone() });
  if (filter.bikeId !== null) params.set("bikeId", String(filter.bikeId));
  if (filter.range !== null) {
    params.set("from", filter.range.from);
    params.set("to", filter.range.to);
  }
  return apiFetch<RidePage>(`/rides?${params.toString()}`);
}

// Months with a ride, YYYY-MM, newest first.
export async function getRideMonths(): Promise<string[]> {
  return apiFetch<string[]>(`/rides/months?tz=${encodeURIComponent(riderTimeZone())}`);
}

// Days and weeks are the rider's own, so the server reads them in the browser's zone.
function riderTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Gets one page of confirmed rides, of one bike when a bike is named.
export async function getRides(limit: number, offset: number, bikeId?: number): Promise<RidePage> {
  const bike = bikeId === undefined ? "" : `&bikeId=${bikeId}`;
  return apiFetch<RidePage>(`/rides?limit=${limit}&offset=${offset}${bike}`);
}
