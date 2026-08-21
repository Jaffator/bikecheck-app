// Ride API calls use the shared client.
import { apiFetch } from "@/api/client";
import type { RidePage } from "./rides.types";

// Gets one page of confirmed rides.
export async function getRides(limit: number, offset: number): Promise<RidePage> {
  return apiFetch<RidePage>(`/rides?limit=${limit}&offset=${offset}`);
}
