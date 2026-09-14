// Notification query hooks.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { getNotifications, markNotificationRead, markNotificationsViewed } from "./notifications.api";
import type { Notification } from "./notifications.types";

export function useNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(false),
  });
}

// How often the badge asks again while the app stays open. Without it the count only
// moves on a window focus, so a notification that arrives mid-session is never counted
// and one cleared elsewhere keeps showing.
const BADGE_POLL_MS = 30_000;

// Fetch unread notifications for the header badge.
export function useUnreadNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications(true),
    refetchOnWindowFocus: true,
    refetchInterval: BADGE_POLL_MS,
  });
}

// Clears the badge of everything that was only waiting to be seen. Called when the list
// opens; the asks it leaves behind are what the badge goes on counting.
export function useMarkNotificationsViewed(): UseMutationResult<{ success: boolean }, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsViewed,
    onSuccess: () => {
      // Only the badge. The list keeps the unread marks it was opened with, so the rows
      // the user is reading do not go grey under their eyes.
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });
}

export function useMarkNotificationRead(): UseMutationResult<{ success: boolean }, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Refresh notification data after marking one as read.
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
