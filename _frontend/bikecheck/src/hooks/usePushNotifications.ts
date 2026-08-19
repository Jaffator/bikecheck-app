import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type PushNotificationSchema } from "@capacitor/push-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { registerFcmToken } from "@/features/notifications/notifications.api";

export interface UsePushNotificationsResult {
  // Set only while the app is in the foreground; drives the in-app banner.
  foregroundNotification: PushNotificationSchema | null;
  dismiss: () => void;
}

// Registers the device for push and keeps the notification cache honest while
// the app is open. Navigation on tap is the caller's job: this hook has no
// router of its own, and mounting it above the routes is what lets the whole
// app share one registration.
export function usePushNotifications(
  onNotificationTapped?: (route: string) => void,
): UsePushNotificationsResult {
  const [foregroundNotification, setForegroundNotification] = useState<PushNotificationSchema | null>(null);
  const queryClient = useQueryClient();

  const dismiss = useCallback((): void => {
    setForegroundNotification(null);
  }, []);

  useEffect(() => {
    // Push is a native capability; on the web there is nothing to register with
    // and the plugin throws rather than no-opping.
    if (!Capacitor.isNativePlatform()) return;

    async function init(): Promise<void> {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      await PushNotifications.register();
    }

    void init();

    const registration = PushNotifications.addListener("registration", (token) => {
      // Through the shared client, so the request carries the session cookie
      // the backend reads the user from — the token belongs to whoever is
      // logged in, and a failure here is not worth breaking the app over.
      void registerFcmToken(token.value, Capacitor.getPlatform()).catch(() => undefined);
    });

    // Fires ONLY when the app is in the foreground -> show our own in-app banner.
    // When the app is in background/closed, the system shows the tray notification itself.
    const received = PushNotifications.addListener("pushNotificationReceived", (notification) => {
      setForegroundNotification(notification);
      // The list and the bell badge are both a request behind at this point.
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["pendingRides"] });
    });

    // Fires when the user taps a tray notification (app was in background).
    const action = PushNotifications.addListener("pushNotificationActionPerformed", (performed) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // The route arrives already filled in by the backend's delivery job; a
      // push without one is a type that opens nothing in particular.
      const route = performed.notification.data?.route as string | undefined;
      if (route) onNotificationTapped?.(route);
    });

    return () => {
      void registration.then((listener) => listener.remove());
      void received.then((listener) => listener.remove());
      void action.then((listener) => listener.remove());
    };
  }, [queryClient, onNotificationTapped]);

  return { foregroundNotification, dismiss };
}
