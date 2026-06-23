import type React from "react";
import { useEffect } from "react";
import type { PushNotificationSchema } from "@capacitor/push-notifications";
import "./InAppNotification.css";

interface InAppNotificationProps {
  notification: PushNotificationSchema;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function InAppNotification({
  notification,
  onDismiss,
  autoDismissMs = 5000,
}: InAppNotificationProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [notification, onDismiss, autoDismissMs]);

  return (
    <div className="in-app-notification" role="alert" onClick={onDismiss}>
      <div className="in-app-notification__title">{notification.title}</div>
      {notification.body && (
        <div className="in-app-notification__body">{notification.body}</div>
      )}
    </div>
  );
}
