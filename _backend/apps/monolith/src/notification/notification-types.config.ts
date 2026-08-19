export interface NotificationFCMToken {
  userId: number;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationChannel = 'push' | 'email' | 'inApp';

export type NotificationType =
  | 'strava_activity_saved'
  | 'strava_unmatched_gear'
  | 'strava_no_gear'
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
  // event, unlike the problem notifications below which repeat until resolved.
  strava_activity_saved: {
    channels: ['push', 'inApp'],
    route: '/bikes/:bikeId',
  },
  strava_unmatched_gear: {
    channels: ['push', 'inApp'],
    route: '/bikes/:bikeId/strava-link',
  },
  strava_no_gear: {
    channels: ['push', 'inApp'],
    // Straight to the one ride that needs an answer, rather than to a list the
    // user then has to search.
    route: '/rides/pending/:activityId',
  },
  maintenance_due: {
    channels: ['push', 'email', 'inApp'],
    route: '/bikes/:bikeId/maintenance',
  },
  achievement_unlocked: {
    channels: ['inApp'],
  },
};
