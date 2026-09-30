// Backend notification response types.

// Supported backend notification types.
export type NotificationType =
  | "strava_activity_saved"
  | "strava_activity_unassigned"
  | "maintenance_due"
  | "service_planned"
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
  // The service wizard's ids for the most worn job a plan reminder opens.
  groupId?: number;
  actionId?: number;
  componentMountedId?: number;
  // The worst band a service reminder's bike stands in, which colours its icon.
  level?: "warning" | "critical" | "overdue";
  // What just crossed on a service reminder, worst first; the first one is what Log service opens.
  crossed?: CrossedAction[];
  // The other party of a follow, as the app names people. Absent when they have none.
  handle?: string;
  personName?: string;
}

// One Tracked Action a service reminder names. The ids are absent on reminders older than them.
export interface CrossedAction {
  componentMountedId?: number;
  actionId?: number;
  groupId?: number;
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
