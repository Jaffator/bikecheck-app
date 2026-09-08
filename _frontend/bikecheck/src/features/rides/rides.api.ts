// Ride API calls use the shared client.
import { apiFetch } from "@/api/client";
import type { RidePage } from "./rides.types";

// Gets one page of confirmed rides, of one bike when a bike is named.
export async function getRides(limit: number, offset: number, bikeId?: number): Promise<RidePage> {
  const bike = bikeId === undefined ? "" : `&bikeId=${bikeId}`;
  return apiFetch<RidePage>(`/rides?limit=${limit}&offset=${offset}${bike}`);
}
