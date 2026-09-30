// The one thing a desktop notification row offers.
import { serviceLink } from "@/features/service_tracking/serviceLink";
import { notificationRoute } from "./notificationRoute";
import type { Notification } from "./notifications.types";

export interface NotificationAction {
  labelKey: string;
  route: string | null;
}

// The wizard on the worst job (ADR 0030), or the bike when the reminder predates the ids.
function logServiceRoute(notification: Notification): string | null {
  const bikeId = notification.payload?.bikeId;
  const worst = notification.payload?.crossed?.[0];
  if (
    bikeId === undefined ||
    worst?.componentMountedId === undefined ||
    worst.actionId === undefined ||
    worst.groupId === undefined
  ) {
    return notificationRoute(notification.type, notification.payload);
  }
  return serviceLink({
    bikeId,
    groupId: worst.groupId,
    actionId: worst.actionId,
    componentMountedId: worst.componentMountedId,
  });
}

// Mirrors the server: an unassigned ride holds the badge until a bike is picked, so it cannot be deleted before.
export function canDeleteNotification(notification: Notification): boolean {
  return notification.is_read || notification.type !== "strava_activity_unassigned";
}

export function notificationAction(notification: Notification): NotificationAction | null {
  const route = notificationRoute(notification.type, notification.payload);

  switch (notification.type) {
    case "maintenance_due":
      // Only a job that is due asks to be recorded; a heads-up just shows the bike.
      return notification.payload?.level === "warning"
        ? { labelKey: "notifications.actionViewBike", route }
        : { labelKey: "notifications.actionLogService", route: logServiceRoute(notification) };
    case "service_planned":
      return { labelKey: "notifications.actionLogService", route };
    case "strava_activity_unassigned":
      return { labelKey: "notifications.actionAssignBike", route };
    case "strava_activity_saved":
      return { labelKey: "notifications.actionViewRide", route };
    case "follow_request":
      return { labelKey: "notifications.actionView", route };
    case "new_follower":
      return { labelKey: "notifications.actionView", route };
    case "follow_accepted":
      return { labelKey: "notifications.actionOpenGarage", route };
    default:
      return null;
  }
}
