// React Query hooks for the service history.
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getServiceHistory } from "./service.api";
import type { ServiceHistoryPage } from "./service.types";

// The service page answers "what did I last do", so it shows only the latest few.
export const RECENT_SERVICE_COUNT = 3;

// Limits each request payload on the full history.
const PAGE_SIZE = 20;

// Distinguishes the all-bikes cache from a filtered one.
function bikeKey(bikeId?: number): number | "all" {
  return bikeId ?? "all";
}

// The most recent services, for the landing page.
export function useRecentServices(bikeId?: number): UseQueryResult<ServiceHistoryPage> {
  return useQuery({
    queryKey: ["services", "recent", bikeKey(bikeId)],
    queryFn: () => getServiceHistory(RECENT_SERVICE_COUNT, 0, bikeId),
  });
}

// The full history, paged in as the user scrolls.
export function useServiceHistory(bikeId?: number): UseInfiniteQueryResult<InfiniteData<ServiceHistoryPage>, Error> {
  return useInfiniteQuery({
    queryKey: ["services", "history", bikeKey(bikeId)],
    queryFn: ({ pageParam }) => getServiceHistory(PAGE_SIZE, pageParam, bikeId),
    initialPageParam: 0,
    // Stop when every service is loaded.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}
