// Home's chart requests.
import { apiFetch } from "@/api/client";
import type { Distance, Spend, WearForecast } from "./stats.types";

// No year: the server picks this one, or last year while this one has nothing priced.
export async function getSpend(): Promise<Spend> {
  return apiFetch<Spend>("/stats/spend");
}

// No year: the server picks this one, or last year while this one has no ride.
export async function getDistance(): Promise<Distance> {
  return apiFetch<Distance>("/stats/distance");
}

export async function getWearForecast(): Promise<WearForecast> {
  return apiFetch<WearForecast>("/stats/wear-forecast");
}
