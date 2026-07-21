// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getBikes, getBike } from "./bikes.api";
import type { Bike } from "./bikes.types";

export function useBikes(): UseQueryResult<Bike[]> {
  return useQuery({
    queryKey: ["bikes"],
    queryFn: getBikes,
  });
}

export function useBike(id: number): UseQueryResult<Bike> {
  return useQuery({
    queryKey: ["bikes", id],
    queryFn: () => getBike(id),
  });
}
