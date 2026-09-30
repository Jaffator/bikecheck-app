// The one thing a desktop notification row offers, and how loudly.
import { serviceLink } from "@/features/service_tracking/serviceLink";
import { notificationRoute } from "./notificationRoute";
import type { Notification } from "./notifications.types";

export type ActionEmphasis = "filled" | "outline" | "text";

export interface NotificationAction {
  labelKey: string;
  route: string | null;
  emphasis: ActionEmphasis;
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

export function notificationAction(notification: Notification): NotificationAction | null {
  const route = notificationRoute(notification.type, notification.payload);

  switch (notification.type) {
    case "maintenance_due":
      // Only a job that is due asks to be recorded; a heads-up just shows the bike.
      return notification.payload?.level === "warning"
        ? { labelKey: "notifications.actionViewBike", route, emphasis: "outline" }
        : { labelKey: "notifications.actionLogService", route: logServiceRoute(notification), emphasis: "filled" };
    case "service_planned":
      return { labelKey: "notifications.actionLogService", route, emphasis: "filled" };
    case "strava_activity_unassigned":
      return { labelKey: "notifications.actionAssignBike", route, emphasis: "filled" };
    case "strava_activity_saved":
      return { labelKey: "notifications.actionViewRide", route, emphasis: "text" };
    case "follow_request":
      return { labelKey: "notifications.actionView", route, emphasis: "outline" };
    case "new_follower":
      return { labelKey: "notifications.actionView", route, emphasis: "text" };
    case "follow_accepted":
      return { labelKey: "notifications.actionOpenGarage", route, emphasis: "text" };
    default:
      return null;
  }
}
