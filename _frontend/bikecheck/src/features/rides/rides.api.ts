// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend routes are under "/rides" (see ride.controller.ts).
import { apiFetch } from "@/api/client";
import type { RidePage } from "./rides.types";

// GET /rides — one page of the user's confirmed rides, newest first.
export async function getRides(limit: number, offset: number): Promise<RidePage> {
  return apiFetch<RidePage>(`/rides?limit=${limit}&offset=${offset}`);
}
