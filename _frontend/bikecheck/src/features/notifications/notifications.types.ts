// Mirrors the backend ResponseNotificationDto
// (notification/dto/response-notification.dto.ts). Dates arrive as ISO strings
// over JSON, so they are typed as string here.

// The types the backend can send. Kept in step with NotificationType in
// notification-types.config.ts.
export type NotificationType =
  | "strava_activity_saved"
  | "strava_unmatched_gear"
  | "strava_no_gear"
  | "maintenance_due"
  | "achievement_unlocked";

// What a notification carries besides its text. Every field is optional: a
// payload only holds what its own type needs, and older rows predate newer
// fields. The client reads these to build the route to open.
export interface NotificationPayload {
  bikeId?: number;
  activityId?: string;
  gearId?: string;
  km?: number;
  bikeName?: string;
}

export interface Notification {
  id: number;
  type: NotificationType;
  // Written by the backend in the user's language at creation time, because a
  // push is rendered by the OS with the app closed. Shown as stored.
  title: string;
  body: string;
  payload: NotificationPayload | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
