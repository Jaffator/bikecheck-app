import { queryOptions, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getBikeLimit } from "./billing.api";
import type { BikeLimit } from "./billing.types";

export const BIKE_LIMIT_QUERY_KEY = ["bikeLimit"] as const;

export const bikeLimitQuery = queryOptions({
  queryKey: BIKE_LIMIT_QUERY_KEY,
  queryFn: getBikeLimit,
});

export function useBikeLimit(): UseQueryResult<BikeLimit> {
  return useQuery(bikeLimitQuery);
}
