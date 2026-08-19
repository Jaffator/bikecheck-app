import type { NotificationPayload, NotificationType } from "./notifications.types";

// The route each type opens, as a template. Mirrors NOTIFICATION_CONFIG on the
// backend (notification-types.config.ts) — the same map travels with a push in
// its data, but the in-app list has no push to read it from.
const ROUTES: Partial<Record<NotificationType, string>> = {
  strava_activity_saved: "/bikes/:bikeId",
  strava_unmatched_gear: "/bikes/:bikeId/strava-link",
  strava_no_gear: "/rides/pending/:activityId",
  maintenance_due: "/bikes/:bikeId/maintenance",
};

// Fills the template from the payload. Returns null when the type opens nothing
// or the payload is missing a placeholder the route needs — navigating to a
// path with a literal ":bikeId" in it would land on a broken screen.
export function notificationRoute(
  type: NotificationType,
  payload: NotificationPayload | null,
): string | null {
  const template = ROUTES[type];
  if (template === undefined) return null;

  const filled = template
    .replace(":bikeId", payload?.bikeId === undefined ? "" : String(payload.bikeId))
    .replace(":activityId", payload?.activityId ?? "");

  return filled.includes("//") || filled.endsWith("/") ? null : filled;
}
