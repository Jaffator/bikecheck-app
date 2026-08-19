import type { NotificationPayload, NotificationType } from "./notifications.types";

// The route each type opens, as a template. Mirrors NOTIFICATION_CONFIG on the
// backend (notification-types.config.ts) — the same map travels with a push in
// its data, but the in-app list has no push to read it from.
const ROUTES: Partial<Record<NotificationType, string>> = {
  strava_activity_saved: "/bikes/:bikeId",
  // The dashboard: an unmatched gear has no BikeCheck bike by definition, and
  // the pairing card that fixes it lives there.
  strava_unmatched_gear: "/",
  strava_no_gear: "/rides/pending/:activityId",
  maintenance_due: "/bikes/:bikeId",
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

  // Every ":name" is filled from the payload field of that name, so a template
  // gaining a placeholder needs no change here. Only a scalar can stand in for
  // a path segment — anything else would stringify to "[object Object]".
  const values = (payload ?? {}) as Record<string, unknown>;
  const filled = template.replace(/:(\w+)/g, (_match, key: string) => {
    const value = values[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  });

  // An unfilled placeholder leaves an empty segment behind. Landing on a broken
  // screen is worse than the notification simply not being a link. The root path
  // is a real destination, so it is exempt from the trailing-slash test.
  if (filled === "/") return filled;
  return filled.includes("//") || filled.endsWith("/") ? null : filled;
}
