import type { NotificationPayload, NotificationType } from "./notifications.types";

// Notification routes by type.
const ROUTES: Partial<Record<NotificationType, string>> = {
  strava_activity_saved: "/bikes/:bikeId",
  // Open the pending rides tab.
  strava_activity_unassigned: "/rides?pending=:activityId",
  maintenance_due: "/bikes/:bikeId",
};

// Return a route only when all placeholders are present.
export function notificationRoute(type: NotificationType, payload: NotificationPayload | null): string | null {
  const template = ROUTES[type];
  if (template === undefined) return null;

  // Replace placeholders from scalar payload values.
  const values = (payload ?? {}) as Record<string, unknown>;
  let missing = false;

  const filled = template.replace(/:(\w+)/g, (_match, key: string) => {
    const value = values[key];
    // Reject non-scalar placeholder values.
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    missing = true;
    return "";
  });

  // Avoid routes with missing values.
  return missing ? null : filled;
}
