import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type PushNotificationSchema } from "@capacitor/push-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { registerFcmToken } from "@/features/notifications/notifications.api";

export interface UsePushNotificationsResult {
  // Holds the push received while the app is in the foreground.
  foregroundNotification: PushNotificationSchema | null;
  dismiss: () => void;
}

// Registers native push and synchronizes notification cache updates.
export function usePushNotifications(onNotificationTapped: (route: string) => void): UsePushNotificationsResult {
  const [foregroundNotification, setForegroundNotification] = useState<PushNotificationSchema | null>(null);
  const queryClient = useQueryClient();

  const dismiss = useCallback((): void => {
    setForegroundNotification(null);
  }, []);

  useEffect(() => {
    // Skips native registration when running on the web.
    if (!Capacitor.isNativePlatform()) return;

    async function init(): Promise<void> {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      await PushNotifications.register();
    }

    void init();

    const registration = PushNotifications.addListener("registration", (token) => {
      // Sends the token through the authenticated shared client.
      void registerFcmToken(token.value, Capacitor.getPlatform()).catch(() => undefined);
    });

    // Shows an in-app banner only for foreground pushes.
    const received = PushNotifications.addListener("pushNotificationReceived", (notification) => {
      setForegroundNotification(notification);
      // Refreshes the notification list and bell badge.
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
    });

    // Handles a system-tray notification tap.
    const action = PushNotifications.addListener("pushNotificationActionPerformed", (performed) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // Opens the backend-provided route when present.
      const route = performed.notification.data?.route as string | undefined;
      if (route) onNotificationTapped(route);
    });

    return () => {
      void registration.then((listener) => listener.remove());
      void received.then((listener) => listener.remove());
      void action.then((listener) => listener.remove());
    };
  }, [queryClient, onNotificationTapped]);

  return { foregroundNotification, dismiss };
}
