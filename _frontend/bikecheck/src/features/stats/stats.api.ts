// Home's chart requests.
import { apiFetch } from "@/api/client";
import type { Spend } from "./stats.types";

// No year: the server picks this one, or last year while this one has nothing priced.
export async function getSpend(): Promise<Spend> {
  return apiFetch<Spend>("/stats/spend");
}
