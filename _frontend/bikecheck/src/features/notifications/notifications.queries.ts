// Notification query hooks.
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markNotificationsViewed,
} from "./notifications.api";
import type { Notification } from "./notifications.types";

const PAGE_SIZE = 30;

// Newest first, 30 at a time; a short page means there is nothing older.
export function useNotifications(): UseInfiniteQueryResult<InfiniteData<Notification[], number | undefined>, Error> {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => getNotifications(PAGE_SIZE, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => (lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].id : undefined),
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
    queryFn: getUnreadNotifications,
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

// Desktop's Mark all as read: the same clearing as opening the phone's list, but the rows update too.
export function useMarkAllNotificationsRead(): UseMutationResult<{ success: boolean }, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsViewed,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification(): UseMutationResult<{ success: boolean }, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteAllNotifications(): UseMutationResult<{ success: boolean }, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
