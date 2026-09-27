// Home's chart queries.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getDistance, getSpend, getWearForecast } from "./stats.api";
import type { Distance, Spend, WearForecast } from "./stats.types";

// Keyed under "services", so every write that drops the history drops the spend with it.
export function useSpend(): UseQueryResult<Spend> {
  return useQuery({
    queryKey: ["services", "spend"],
    queryFn: getSpend,
  });
}

// Keyed under "rides", so archiving a bike and coming back to the app redraw it.
export function useDistance(): UseQueryResult<Distance> {
  return useQuery({
    queryKey: ["rides", "distance"],
    queryFn: getDistance,
  });
}

// Keyed under "tracked-actions", so a Service, a drawer write or new rides redraw it.
export function useWearForecast(): UseQueryResult<WearForecast> {
  return useQuery({
    queryKey: ["tracked-actions", "forecast"],
    queryFn: getWearForecast,
  });
}
