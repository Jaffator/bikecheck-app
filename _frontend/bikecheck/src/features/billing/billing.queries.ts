import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getBikeLimit, redeemKey } from "./billing.api";
import type { BikeLimit } from "./billing.types";

export const BIKE_LIMIT_QUERY_KEY = ["bikeLimit"] as const;

export const bikeLimitQuery = queryOptions({
  queryKey: BIKE_LIMIT_QUERY_KEY,
  queryFn: getBikeLimit,
});

export function useBikeLimit(): UseQueryResult<BikeLimit> {
  return useQuery(bikeLimitQuery);
}

// A hook option, not mutate's own: Pro lands even when the sheet is gone by then.
export function useRedeemKey(): UseMutationResult<BikeLimit, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemKey,
    onSuccess: async (limit) => {
      // A read already under way would come back without Pro.
      await queryClient.cancelQueries({ queryKey: BIKE_LIMIT_QUERY_KEY });
      queryClient.setQueryData(BIKE_LIMIT_QUERY_KEY, limit);
    },
  });
}
