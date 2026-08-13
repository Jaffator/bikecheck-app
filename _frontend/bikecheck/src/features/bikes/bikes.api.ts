// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend routes are under "/bike" (see bike.controller.ts).
import { apiFetch } from "@/api/client";
import type { Bike, BikeFormOptions } from "./bikes.types";

// GET /bike — bikes of the current user.
export async function getBikes(): Promise<Bike[]> {
  return apiFetch<Bike[]>("/bike");
}

// GET /bike/:id — one bike by id.
export async function getBike(id: number): Promise<Bike> {
  return apiFetch<Bike>(`/bike/${id}`);
}

export async function getBikeFormOptions(): Promise<BikeFormOptions> {
  return apiFetch<BikeFormOptions>(`/bike/form-options`);
}
