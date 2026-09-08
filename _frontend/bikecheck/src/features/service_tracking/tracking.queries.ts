// Service Tracking query hooks.
import { skipToken, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getBikeTrackedActions } from "./tracking.api";
import type { TrackedAction } from "./tracking.types";

// One bike's Tracked Actions. Read on its own key, so the section and the badge share one
// request and neither holds up the photo above them.
export function useBikeTrackedActions(bikeId: number | null): UseQueryResult<TrackedAction[]> {
  return useQuery({
    queryKey: ["tracked-actions", bikeId],
    // Nothing to read until there is a bike, and skipToken says so without a cast.
    queryFn: bikeId === null ? skipToken : () => getBikeTrackedActions(bikeId),
  });
}
