import { apiFetch } from "@/api/client";
import type { BikeLimit } from "./billing.types";

// GET /billing/bike-limit: the account's limit and what counts against it.
export async function getBikeLimit(): Promise<BikeLimit> {
  return apiFetch<BikeLimit>("/billing/bike-limit");
}
