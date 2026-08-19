// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { Browser } from "@capacitor/browser";
import {
  getStravaAuthorizeUrl,
  disconnectStrava,
  getGearLinking,
  linkStravaGear,
  getPendingRides,
  getPendingRide,
  resolvePendingRide,
} from "./strava.api";
import type { GearLinkingData, GearLink, PendingRide } from "./strava.types";
import type { ApiError } from "@/api/client";

// Opens the Strava authorize page in the system browser. The link itself is
// stored by the backend during the OAuth callback, so nothing is written here —
// useStravaDeepLink refreshes the user once the flow brings the app back.
export function useConnectStrava(): UseMutationResult<void, ApiError, void> {
  return useMutation({
    mutationFn: async () => {
      const { url } = await getStravaAuthorizeUrl();
      await Browser.open({ url });
    },
  });
}

// Unlinks the account. strava_athlete_id lives on the user, so that is what has
// to be refetched for the UI to flip back to "not connected".
export function useDisconnectStrava(): UseMutationResult<{ success: boolean }, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectStrava,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// TEMPORARY: stands in for getGearLinking while the sheet is being styled, so
// opening it does not call the backend. Delete this and point useGearLinking
// back at getGearLinking when the styling is done.
async function getGearLinkingMock(): Promise<GearLinkingData> {
  return {
    user_id: 1,
    athlete_id: 1,
    strava_bikes: [
      { id: "b1234567", name: "S-Works Tarmac" },
      { id: "b7654321", name: "Epic EVO" },
      { id: "b9998887", name: "Crux Gravel" },
    ],
    bikecheck_bikes: [
      {
        id: 1,
        strava_gear_id: null,
        bikename: "S-Works Tarmac",
        bike_brand: "Specialized",
        bike_model: "Tarmac",
      },
      {
        id: 2,
        strava_gear_id: null,
        bikename: null,
        bike_brand: "Specialized",
        bike_model: "Epic EVO",
      },
      {
        id: 3,
        strava_gear_id: "b9998887",
        bikename: "Crux",
        bike_brand: "Specialized",
        bike_model: "Crux",
      },
    ],
  };
}

// The user's Strava gear next to their BikeCheck bikes. Only ever asked for once
// an account is linked — without one the backend has no athlete to query.
export function useGearLinking(enabled: boolean): UseQueryResult<GearLinkingData> {
  return useQuery({
    queryKey: ["gearLinking"],
    queryFn: getGearLinking,
    enabled,
  });
}

// Writes the pairings. Bikes carry strava_gear_id and the mileage the backend
// backfills from rides that were waiting on a gear id, so both are refetched.
export function useLinkStravaGear(): UseMutationResult<{ success: boolean }, ApiError, GearLink[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkStravaGear,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bikes"] });
      void queryClient.invalidateQueries({ queryKey: ["gearLinking"] });
    },
  });
}

// Rides that arrived without a bike. Drives the dashboard card and the list the
// notification opens, so it is asked for on the dashboard as well.
export function usePendingRides(): UseQueryResult<PendingRide[]> {
  return useQuery({
    queryKey: ["pendingRides"],
    queryFn: getPendingRides,
  });
}

export function usePendingRide(activityId: string): UseQueryResult<PendingRide> {
  return useQuery({
    queryKey: ["pendingRides", activityId],
    queryFn: () => getPendingRide(activityId),
  });
}

// Assigns one pending ride to a bike. The ride's distance lands on the bike and
// its components, and the notification that asked about it is dismissed, so the
// bikes and the notification badge are refetched alongside the pending list.
export function useResolvePendingRide(): UseMutationResult<
  { success: boolean },
  ApiError,
  { activityId: string; bikeId: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, bikeId }: { activityId: string; bikeId: number }) =>
      resolvePendingRide(activityId, bikeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
      void queryClient.invalidateQueries({ queryKey: ["bikes"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
