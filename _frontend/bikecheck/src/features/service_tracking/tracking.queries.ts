// Service Tracking query hooks.
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getBikeTrackedActions,
  getGarageTrackedActions,
  setTrackedActionInterval,
  setTrackedActionNotify,
  setTrackedActionPlan,
} from "./tracking.api";
import type {
  GarageTrackedAction,
  SetTrackedActionIntervalInput,
  SetTrackedActionNotifyInput,
  SetTrackedActionPlanInput,
  TrackedAction,
} from "./tracking.types";

// A write that moves a reading moves what every ride wore off with it, so the ride list goes too.
// Exact: the distance chart shares the prefix and no reading moves it.
export async function invalidateReadings(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
  await queryClient.invalidateQueries({ queryKey: ["rides"], exact: true });
}

// One bike's Tracked Actions. Read on its own key, so the section and the badge share one
// request and neither holds up the photo above them.
export function useBikeTrackedActions(bikeId: number | null): UseQueryResult<TrackedAction[]> {
  return useQuery({
    queryKey: ["tracked-actions", bikeId],
    // Nothing to read until there is a bike, and skipToken says so without a cast.
    queryFn: bikeId === null ? skipToken : () => getBikeTrackedActions(bikeId),
  });
}

// What the whole garage owes, from the given percentage up. Its own key, so the dashboard
// section never waits on any one bike's page.
export function useGarageTrackedActions(minPercentage: number): UseQueryResult<GarageTrackedAction[]> {
  return useQuery({
    queryKey: ["tracked-actions", "garage", minPercentage],
    queryFn: () => getGarageTrackedActions(minPercentage),
  });
}

// A new Service Interval moves the reading it is set on, and the bike's list and the
// dashboard's both show that reading — so both are dropped, whichever card the drawer was
// opened from.
export function useSetTrackedActionInterval(): UseMutationResult<TrackedAction, Error, SetTrackedActionIntervalInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetTrackedActionIntervalInput) => setTrackedActionInterval(input),
    onSuccess: async () => {
      await invalidateReadings(queryClient);
    },
  });
}

// Muting moves no reading, but the row draws the mute — so the lists are dropped too,
// rather than leaving one card saying something the other does not.
export function useSetTrackedActionNotify(): UseMutationResult<TrackedAction, Error, SetTrackedActionNotifyInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetTrackedActionNotifyInput) => setTrackedActionNotify(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
    },
  });
}

// A plan moves no reading, but every card draws its day - so the lists are dropped too.
export function useSetTrackedActionPlan(): UseMutationResult<TrackedAction, Error, SetTrackedActionPlanInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetTrackedActionPlanInput) => setTrackedActionPlan(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
    },
  });
}
