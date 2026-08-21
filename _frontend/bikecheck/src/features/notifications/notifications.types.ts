// Backend notification response types.

// Supported backend notification types.
export type NotificationType =
  | "strava_activity_saved"
  | "strava_activity_unassigned"
  | "maintenance_due"
  | "achievement_unlocked";

// Optional data used to open notification routes.
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
  // Localized notification text from the backend.
  title: string;
  body: string;
  payload: NotificationPayload | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
