// Encapsulate bike loading, mutations, and cache state.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import {
  getBikes,
  getBike,
  getBikeFormOptions,
  searchBikeExternal,
  getExternalFamilyBikes,
  getExternalBikeComponents,
  createBike,
  updateBike,
  deleteBike,
} from "./bikes.api";
import type {
  Bike,
  BikeFormOptions,
  BikeSearchResult,
  CreateBikeInput,
  ExternalBikeComponent,
  UpdateBikeInput,
} from "./bikes.types";

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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["bikes", id],
    queryFn: () => getBike(id),
    // Seed details from the garage cache while refetching.
    initialData: () => queryClient.getQueryData<Bike[]>(["bikes"])?.find((bike) => bike.id === id),
    // Preserve the garage cache timestamp for stale-data refetching.
    initialDataUpdatedAt: () => queryClient.getQueryState(["bikes"])?.dataUpdatedAt,
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

// Collections are read by URL, so a list already opened comes back from cache.
export function useFamilyBikes(url: string | null): UseQueryResult<BikeSearchResult[]> {
  return useQuery({
    queryKey: ["bike-external-family", url],
    queryFn: () => getExternalFamilyBikes(url ?? ""),
    enabled: url !== null,
    staleTime: Infinity,
    // Report failed scrapes without automatic retries.
    retry: false,
  });
}

// Refresh cached bike lists after creation.
export function useCreateBike(): UseMutationResult<Bike, Error, CreateBikeInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBikeInput) => createBike(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
      // Refresh bikes available to the gear-pairing sheet.
      await queryClient.invalidateQueries({ queryKey: ["gearLinking"] });
    },
  });
}

// Refresh the garage, the bike itself and the pairing sheet after a correction.
export function useUpdateBike(): UseMutationResult<Bike, Error, UpdateBikeInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBikeInput) => updateBike(input),
    onSuccess: async (bike) => {
      // The detail page reads this key, so it is written before anything is invalidated.
      queryClient.setQueryData(["bikes", bike.id], bike);
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
      await queryClient.invalidateQueries({ queryKey: ["gearLinking"] });
    },
  });
}

// Cache slow component scrapes by bike URL.
export function useExternalBikeComponents(bikeUrl: string | null): UseQueryResult<ExternalBikeComponent[]> {
  return useQuery({
    queryKey: ["bike-external-components", bikeUrl],
    queryFn: () => getExternalBikeComponents(bikeUrl ?? ""),
    enabled: bikeUrl !== null,
    staleTime: Infinity,
    // Report failed scrapes without automatic retries.
    retry: false,
  });
}

// Refresh garage and pairing caches after deletion.
export function useDeleteBike(): UseMutationResult<Bike, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteBike(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
      await queryClient.invalidateQueries({ queryKey: ["gearLinking"] });
    },
  });
}
