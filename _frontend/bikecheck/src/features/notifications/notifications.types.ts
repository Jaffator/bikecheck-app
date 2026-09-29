// Backend notification response types.

// Supported backend notification types.
export type NotificationType =
  | "strava_activity_saved"
  | "strava_activity_unassigned"
  | "maintenance_due"
  | "achievement_unlocked"
  | "new_follower"
  | "follow_request"
  | "follow_accepted";

// Optional data used to open notification routes.
export interface NotificationPayload {
  bikeId?: number;
  activityId?: string;
  gearId?: string;
  km?: number;
  elevationM?: number;
  bikeName?: string;
  // The worst band a service reminder's bike stands in, which colours its icon.
  level?: "warning" | "critical" | "overdue";
  // The other party of a follow, as the app names people. Absent when they have none.
  handle?: string;
  personName?: string;
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
