// React Query hooks own Strava loading, error, and cache state.
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { Browser } from "@capacitor/browser";
import {
  getStravaAuthorizeUrl,
  disconnectStrava,
  getGearLinking,
  linkStravaGear,
  getPendingRides,
  resolvePendingRide,
} from "./strava.api";
import type { GearLinkingData, GearLink, PendingRide } from "./strava.types";
import type { ApiError } from "@/api/client";

// Opens the backend-generated Strava authorization URL in the system browser.
export function useConnectStrava(): UseMutationResult<void, ApiError, void> {
  return useMutation({
    mutationFn: async () => {
      const { url } = await getStravaAuthorizeUrl();
      await Browser.open({ url });
    },
  });
}

// Unlinks Strava and refetches the user connection state.
export function useDisconnectStrava(): UseMutationResult<{ success: boolean }, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectStrava,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// Retrieves Strava gear only when the account is linked.
export function useGearLinking(enabled: boolean): UseQueryResult<GearLinkingData> {
  return useQuery({
    queryKey: ["gearLinking"],
    queryFn: getGearLinking,
    enabled,
  });
}

// Writes pairings and refetches bikes plus linking data.
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

// Retrieves rides awaiting bike assignment for dashboard and list views.
export function usePendingRides(): UseQueryResult<PendingRide[]> {
  return useQuery({
    queryKey: ["pendingRides"],
    queryFn: getPendingRides,
  });
}

// Assigns a pending ride and refetches affected ride, bike, and notification data.
export function useResolvePendingRide(): UseMutationResult<
  { success: boolean },
  ApiError,
  { activityId: string; bikeId: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, bikeId }: { activityId: string; bikeId: number }) => resolvePendingRide(activityId, bikeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
      void queryClient.invalidateQueries({ queryKey: ["bikes"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
