// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { getNotifications, markNotificationRead } from "./notifications.api";
import type { Notification } from "./notifications.types";

export function useNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(false),
  });
}

// Drives the badge on the header bell, so it is asked for on every screen.
// There is no websocket: a push arriving in the foreground invalidates this
// key, and a return to the app refetches it.
export function useUnreadNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications(true),
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead(): UseMutationResult<
  { success: boolean },
  Error,
  number
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Both the list and the badge count change when one is read.
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
