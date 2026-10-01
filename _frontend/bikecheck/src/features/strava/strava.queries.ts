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
  dismissPendingRide,
  syncStrava,
} from "./strava.api";
import type { GearLinkingData, GearLink, PendingRide, StravaSyncResult } from "./strava.types";
import type { ApiError } from "@/api/client";
import { BADGE_POLL_MS } from "@/features/notifications/notifications.queries";

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
    // Polls like the bell, so a ride landing mid-session reaches the banner and the sidebar count.
    refetchInterval: BADGE_POLL_MS,
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
    onSuccess: () => invalidateRideLists(queryClient),
  });
}

// Queued rides need a few seconds in the pipeline before a refetch can see them.
const SYNC_SETTLE_MS = 5000;

// Every list a ride leaving Pending can change.
function invalidateRideLists(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
  void queryClient.invalidateQueries({ queryKey: ["rides"] });
  void queryClient.invalidateQueries({ queryKey: ["bikes"] });
  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

// Drops a pending ride for good and refetches what resolving it would.
export function useDismissPendingRide(): UseMutationResult<{ success: boolean }, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissPendingRide,
    onSuccess: () => invalidateRideLists(queryClient),
  });
}

// Asks Strava for missed rides; the lists reload once the queued ones have had time to land.
export function useSyncStrava(): UseMutationResult<StravaSyncResult, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncStrava,
    onSuccess: ({ queued }) => {
      if (queued > 0) setTimeout(() => invalidateRideLists(queryClient), SYNC_SETTLE_MS);
    },
    // A 429 still means the backend knows a newer sync time than the client.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
