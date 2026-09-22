// Service Tracking query hooks.
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getBikeTrackedActions,
  getGarageTrackedActions,
  postponeTrackedAction,
  setTrackedActionInterval,
  setTrackedActionNotify,
} from "./tracking.api";
import type {
  GarageTrackedAction,
  PostponeTrackedActionInput,
  SetTrackedActionIntervalInput,
  SetTrackedActionNotifyInput,
  TrackedAction,
} from "./tracking.types";

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

// Putting a job off moves the reading it was put off on, and the bike's list and the
// dashboard's both show it — so every Tracked Action read is dropped, and the row the
// owner just tapped redraws itself.
export function usePostponeTrackedAction(): UseMutationResult<TrackedAction, Error, PostponeTrackedActionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PostponeTrackedActionInput) => postponeTrackedAction(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
    },
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
      await queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
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
