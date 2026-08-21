// Notification query hooks.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { getNotifications, markNotificationRead } from "./notifications.api";
import type { Notification } from "./notifications.types";

export function useNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(false),
  });
}

// Fetch unread notifications for the header badge.
export function useUnreadNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications(true),
    refetchOnWindowFocus: true,
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
