// Home's chart requests.
import { apiFetch } from "@/api/client";
import type { Distance, HomePeriod, Spend, WearForecast } from "./stats.types";

// No Period: the server picks this year, or last year while this one has nothing priced.
export async function getSpend(period?: HomePeriod): Promise<Spend> {
  return apiFetch<Spend>(`/stats/spend${periodQuery(period)}`);
}

// No Period: the server picks this year, or last year while this one has no ride.
export async function getDistance(period?: HomePeriod): Promise<Distance> {
  return apiFetch<Distance>(`/stats/distance${periodQuery(period)}`);
}

export async function getWearForecast(): Promise<WearForecast> {
  return apiFetch<WearForecast>("/stats/wear-forecast");
}

function periodQuery(period?: HomePeriod): string {
  return period === undefined ? "" : `?period=${period}`;
}
