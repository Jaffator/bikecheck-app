// Home's chart queries.
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getDistance, getSpend, getWearForecast } from "./stats.api";
import type { Distance, HomePeriod, Spend, WearForecast } from "./stats.types";

// Keyed under "services", so every write that drops the history drops the spend with it. The last
// Period's numbers hold their place while the next one loads.
export function useSpend(period?: HomePeriod): UseQueryResult<Spend> {
  return useQuery({
    queryKey: ["services", "spend", period ?? "default"],
    queryFn: () => getSpend(period),
    placeholderData: keepPreviousData,
  });
}

// Keyed under "rides", so archiving a bike and coming back to the app redraw it.
export function useDistance(period?: HomePeriod): UseQueryResult<Distance> {
  return useQuery({
    queryKey: ["rides", "distance", period ?? "default"],
    queryFn: () => getDistance(period),
    placeholderData: keepPreviousData,
  });
}

// Keyed under "tracked-actions", so a Service, a drawer write or new rides redraw it.
export function useWearForecast(): UseQueryResult<WearForecast> {
  return useQuery({
    queryKey: ["tracked-actions", "forecast"],
    queryFn: getWearForecast,
  });
}
