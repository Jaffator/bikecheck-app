import { apiFetch } from "@/api/client";
import type { BikeLimit } from "./billing.types";

// GET /billing/bike-limit: the account's limit and what counts against it.
export async function getBikeLimit(): Promise<BikeLimit> {
  return apiFetch<BikeLimit>("/billing/bike-limit");
}

// POST /billing/redeem-key: answers with the new limit; 404 not valid, 409 used up, 429 too many tries.
export async function redeemKey(code: string): Promise<BikeLimit> {
  return apiFetch<BikeLimit>("/billing/redeem-key", { method: "POST", body: JSON.stringify({ code }) });
}
