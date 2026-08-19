import type { NotificationPayload, NotificationType } from "./notifications.types";

// The route each type opens, as a template. Mirrors NOTIFICATION_CONFIG on the
// backend (notification-types.config.ts) — the same map travels with a push in
// its data, but the in-app list has no push to read it from.
const ROUTES: Partial<Record<NotificationType, string>> = {
  strava_activity_saved: "/bikes/:bikeId",
  // Opens the Pending tab with this ride's sheet already up.
  strava_activity_unassigned: "/rides?pending=:activityId",
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
  // gaining a placeholder needs no change here. Tracked rather than inferred
  // from the result: a placeholder can sit in a query value as well as a path
  // segment, where an empty string leaves no shape to detect afterwards.
  const values = (payload ?? {}) as Record<string, unknown>;
  let missing = false;

  const filled = template.replace(/:(\w+)/g, (_match, key: string) => {
    const value = values[key];
    // Only a scalar can stand in for a placeholder — anything else would
    // stringify to "[object Object]".
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    missing = true;
    return "";
  });

  // Not linking at all beats landing on a blank screen.
  return missing ? null : filled;
}
