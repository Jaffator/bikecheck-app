import { useCallback, useEffect, useState } from "react";
import { CapacitorHttp, Capacitor } from "@capacitor/core";
import { PushNotifications, type PushNotificationSchema } from "@capacitor/push-notifications";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await CapacitorHttp.post({
      url: `${API_BASE_URL}/notifications/fcm-token`,
      headers: { "Content-Type": "application/json" },
      data: { token, platform: Capacitor.getPlatform() },
    });
    console.log("FCM token sent to backend");
  } catch (error) {
    console.error("Failed to send FCM token:", error);
  }
}

export interface UsePushNotificationsResult {
  // Set only while the app is in the foreground; drives the in-app banner.
  foregroundNotification: PushNotificationSchema | null;
  dismiss: () => void;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [foregroundNotification, setForegroundNotification] = useState<PushNotificationSchema | null>(null);

  const dismiss = useCallback((): void => {
    setForegroundNotification(null);
  }, []);

  useEffect(() => {
    async function init(): Promise<void> {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      await PushNotifications.register();
    }

    void init();

    const registration = PushNotifications.addListener("registration", (token) => {
      console.log("FCM TOKEN:", token.value);
      void sendTokenToBackend(token.value);
    });

    // Fires ONLY when the app is in the foreground -> show our own in-app banner.
    // When the app is in background/closed, the system shows the tray notification itself.
    const received = PushNotifications.addListener("pushNotificationReceived", (notification) => {
      setForegroundNotification(notification);
    });

    // Fires when the user taps a tray notification (app was in background) -> navigate.
    const action = PushNotifications.addListener("pushNotificationActionPerformed", (performed) => {
      // TODO: navigate using performed.notification.data.route
      console.log("PUSH TAPPED:", performed.notification);
    });

    return () => {
      void registration.then((listener) => listener.remove());
      void received.then((listener) => listener.remove());
      void action.then((listener) => listener.remove());
    };
  }, []);

  return { foregroundNotification, dismiss };
}
