// React Query hooks for rides.
import { useInfiniteQuery, type UseInfiniteQueryResult, type InfiniteData } from "@tanstack/react-query";
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
