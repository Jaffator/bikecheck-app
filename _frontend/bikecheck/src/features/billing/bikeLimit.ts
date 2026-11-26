import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { BIKE_LIMIT_QUERY_KEY, bikeLimitQuery } from "./billing.queries";
import type { BikeLimit } from "./billing.types";

const BIKE_LIMIT_REACHED = "BIKE_LIMIT_REACHED";

export function isBikeLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.details.includes(BIKE_LIMIT_REACHED);
}

export function hasPro({ pro_since }: BikeLimit): boolean {
  return pro_since !== null;
}

// Pro has no bike limit.
export function hasRoom(state: BikeLimit): boolean {
  return hasPro(state) || state.bike_count < state.bike_limit;
}

// Read without a request, so the wizard opens in the same tick as the tap.
export function knownToHaveRoom(queryClient: QueryClient): boolean {
  const state = queryClient.getQueryState<BikeLimit>(BIKE_LIMIT_QUERY_KEY);
  return state?.data !== undefined && !state.isInvalidated && hasRoom(state.data);
}

// A cached refusal is asked again: Pro or a higher limit may have come meanwhile.
export async function askForRoom(queryClient: QueryClient): Promise<boolean> {
  try {
    return hasRoom(await queryClient.fetchQuery({ ...bikeLimitQuery, staleTime: 0 }));
  } catch {
    // Unreachable: go by the last answer, or let the server decide on save.
    const last = queryClient.getQueryData(bikeLimitQuery.queryKey);
    return last === undefined || hasRoom(last);
  }
}
