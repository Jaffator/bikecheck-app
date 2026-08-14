// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useQuery, useMutation, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { getBikes, getBike, getBikeFormOptions, searchBikeExternal } from "./bikes.api";
import type { Bike, BikeFormOptions, BikeSearchResult } from "./bikes.types";

interface BikeSearchInput {
  bikeName: string;
  year: string;
}

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
export function useBikeFormOptions(): UseQueryResult<BikeFormOptions> {
  return useQuery({
    queryKey: ["bike-form-options"],
    queryFn: getBikeFormOptions,
  });
}

// A mutation, not a query — the search runs on submit, not on render.
export function useSearchBikeExternal(): UseMutationResult<BikeSearchResult[], Error, BikeSearchInput> {
  return useMutation({
    mutationFn: ({ bikeName, year }: BikeSearchInput) => searchBikeExternal(bikeName, year),
  });
}
