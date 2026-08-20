// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useInfiniteQuery, type UseInfiniteQueryResult, type InfiniteData } from "@tanstack/react-query";
import { getRides } from "./rides.api";
import type { RidePage } from "./rides.types";

// How many rides one request asks for. Rides carry their raw Strava payload,
// so the page is kept small enough to stay quick on mobile data.
const PAGE_SIZE = 20;

// The user's confirmed rides, a page at a time. The list asks for the next
// page as the user reaches the end of the current one.
export function useRides(): UseInfiniteQueryResult<InfiniteData<RidePage>, Error> {
  return useInfiniteQuery({
    queryKey: ["rides"],
    queryFn: ({ pageParam }) => getRides(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    // The offset the next page starts at, or undefined once every ride has
    // arrived — which is what stops the list asking for more.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}
