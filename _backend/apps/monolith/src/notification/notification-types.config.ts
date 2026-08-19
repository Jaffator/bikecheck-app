export interface NotificationFCMToken {
  userId: number;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationChannel = 'push' | 'email' | 'inApp';

export type NotificationType =
  | 'strava_activity_saved'
  | 'strava_activity_unassigned'
  | 'maintenance_due'
  | 'achievement_unlocked';

export interface NotificationTypeConfig {
  channels: NotificationChannel[];
  route?: string;
}

export interface PendingActivities {
  activityId?: bigint; // if undefined → all current activities
  gearId: string | null; // null = activites with no gearID
  bikeId: number;
  userId: number;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  // A ride that landed on a bike by itself. No dedup key: every ride is its own
  // event, so every ride gets its own notification.
  strava_activity_saved: {
    channels: ['push', 'inApp'],
    route: '/bikes/:bikeId',
  },
  // A ride the app could not put on a bike by itself — whether Strava sent no
  // gear at all, or gear that matches nothing here. Both leave the user with
  // the same job, so they are one notification rather than two: the rider is
  // not expected to keep gear tidy on Strava's side.
  // No dedup key either, for the same reason as above.
  strava_activity_unassigned: {
    channels: ['push', 'inApp'],
    // Opens the Pending tab with this ride's sheet already up.
    route: '/rides?pending=:activityId',
  },
  maintenance_due: {
    channels: ['push', 'email', 'inApp'],
    // No maintenance sub-screen exists yet; the bike itself is the closest
    // thing the app can actually open.
    route: '/bikes/:bikeId',
  },
  achievement_unlocked: {
    channels: ['inApp'],
  },
};
