import { apiFetch } from "@/api/client";
import type { BikeLimit } from "./billing.types";

// GET /billing/bike-limit: the account's limit and what counts against it.
export async function getBikeLimit(): Promise<BikeLimit> {
  return apiFetch<BikeLimit>("/billing/bike-limit");
}

// POST /billing/redeem-key: the limit as it stands after the key.
export async function redeemKey(code: string): Promise<BikeLimit> {
  return apiFetch<BikeLimit>("/billing/redeem-key", { method: "POST", body: JSON.stringify({ code }) });
}
