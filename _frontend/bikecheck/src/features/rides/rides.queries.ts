// React Query hooks for rides.
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getRides } from "./rides.api";
import type { RidePage } from "./rides.types";

// Limits each request payload.
const PAGE_SIZE = 20;

// Fetches confirmed rides by page.
export function useRides(): UseInfiniteQueryResult<InfiniteData<RidePage>, Error> {
  return useInfiniteQuery({
    queryKey: ["rides"],
    queryFn: ({ pageParam }) => getRides(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    // Stop when every ride is loaded.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

// How many rides one bike has, which is what the archive dialog says stops counting. One
// ride is asked for and thrown away; only the total is read.
export function useBikeRideCount(bikeId: number | null): UseQueryResult<number> {
  return useQuery({
    queryKey: ["rides", "count", bikeId],
    queryFn: async () => (await getRides(1, 0, bikeId ?? 0)).total,
    enabled: bikeId !== null,
  });
}
