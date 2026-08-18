// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  getBikes,
  getBike,
  getBikeFormOptions,
  searchBikeExternal,
  getExternalBikeComponents,
  createBike,
} from "./bikes.api";
import type {
  Bike,
  BikeFormOptions,
  BikeSearchResult,
  CreateBikeInput,
  ExternalBikeComponent,
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
    // The garage list already holds this bike, so opening one renders straight
    // from it instead of flashing a spinner. The full record is still fetched
    // underneath — the list carries every field the detail needs, but it is a
    // snapshot from whenever the list was loaded.
    initialData: () => queryClient.getQueryData<Bike[]>(["bikes"])?.find((bike) => bike.id === id),
    // Without this the seeded value counts as fresh for the usual staleTime and
    // the real fetch never runs. Dated to the list it came from, so the refetch
    // happens once that snapshot is itself stale.
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

// The new bike has to show up in the list the wizard returns to, so the cache
// is invalidated on success.
export function useCreateBike(): UseMutationResult<Bike, Error, CreateBikeInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBikeInput) => createBike(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}

// Scraping is slow, so the result is cached per URL — going back and forth
// between the wizard steps must not trigger it again.
export function useExternalBikeComponents(bikeUrl: string | null): UseQueryResult<ExternalBikeComponent[]> {
  return useQuery({
    queryKey: ["bike-external-components", bikeUrl],
    queryFn: () => getExternalBikeComponents(bikeUrl ?? ""),
    enabled: bikeUrl !== null,
    staleTime: Infinity,
    // A failed scrape is reported straight away — retrying leaves the user
    // watching a spinner for the provider to fail three times over.
    retry: false,
  });
}
