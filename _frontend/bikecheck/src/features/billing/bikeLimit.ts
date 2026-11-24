import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { BIKE_LIMIT_QUERY_KEY, bikeLimitQuery } from "./billing.queries";
import type { BikeLimit } from "./billing.types";

const BIKE_LIMIT_REACHED = "BIKE_LIMIT_REACHED";

export function isBikeLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.details.includes(BIKE_LIMIT_REACHED);
}

export function hasRoom({ bike_count, bike_limit }: BikeLimit): boolean {
  return bike_count < bike_limit;
}

// Read without a request, so the wizard opens in the same tick as the tap.
export function knownToHaveRoom(queryClient: QueryClient): boolean {
  const state = queryClient.getQueryState<BikeLimit>(BIKE_LIMIT_QUERY_KEY);
  return state?.data !== undefined && !state.isInvalidated && hasRoom(state.data);
}

// A cached refusal is asked again: the limit may have been raised meanwhile.
export async function askForRoom(queryClient: QueryClient): Promise<boolean> {
  try {
    return hasRoom(await queryClient.fetchQuery({ ...bikeLimitQuery, staleTime: 0 }));
  } catch {
    // Unreachable: go by the last answer, or let the server decide on save.
    const last = queryClient.getQueryData(bikeLimitQuery.queryKey);
    return last === undefined || hasRoom(last);
  }
}
