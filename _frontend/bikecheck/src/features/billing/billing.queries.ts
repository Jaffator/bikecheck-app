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

// A hook option, not mutate's own: the raised limit unmounts the form, which would drop that.
export function useRedeemKey(onRedeemed: (limit: BikeLimit) => void): UseMutationResult<BikeLimit, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemKey,
    onSuccess: (limit) => {
      queryClient.setQueryData(BIKE_LIMIT_QUERY_KEY, limit);
      onRedeemed(limit);
    },
  });
}
