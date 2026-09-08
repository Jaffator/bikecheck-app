// Encapsulate bike loading, mutations, and cache state.
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getBikes,
  getBike,
  getBikeFormOptions,
  searchBikeExternal,
  getExternalFamilyBikes,
  getExternalBikeComponents,
  createBike,
  updateBike,
  archiveBike,
  unarchiveBike,
  deleteBikePermanently,
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
    queryFn: () => getBikes(),
  });
}

// The archive behind the Settings row. Its own key, so putting a bike aside never has to
// be reconciled into the garage list.
export function useArchivedBikes(enabled = true): UseQueryResult<Bike[]> {
  return useQuery({
    queryKey: ["bikes", "archived"],
    queryFn: () => getBikes(true),
    enabled,
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

// Everything an archived bike leaves: the garage, the rides list, the service history and
// its totals, the pairing sheet and the pending rides archiving discarded.
async function refreshAfterArchiveChange(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["bikes"] });
  await queryClient.invalidateQueries({ queryKey: ["gearLinking"] });
  await queryClient.invalidateQueries({ queryKey: ["rides"] });
  await queryClient.invalidateQueries({ queryKey: ["services"] });
  await queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
}

// Archiving: the bike leaves the garage, keeping its whole history (ADR 0024).
export function useArchiveBike(): UseMutationResult<Bike, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => archiveBike(id),
    onSuccess: () => refreshAfterArchiveChange(queryClient),
  });
}

// Back into use, from the archive.
export function useUnarchiveBike(): UseMutationResult<Bike, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => unarchiveBike(id),
    onSuccess: () => refreshAfterArchiveChange(queryClient),
  });
}

// The irreversible act, offered nowhere but the archive.
export function useDeleteBikePermanently(): UseMutationResult<Bike, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteBikePermanently(id),
    onSuccess: async () => {
      await refreshAfterArchiveChange(queryClient);
      // The documents made from it survive it, but the list is read again all the same.
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
