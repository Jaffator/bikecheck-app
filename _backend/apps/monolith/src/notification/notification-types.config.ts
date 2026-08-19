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
    // The dashboard, not a bike: this notification fires precisely because no
    // BikeCheck bike matches the gear, so there is no bike id to route to. The
    // dashboard is where the pairing card and its sheet live.
    route: '/',
  },
  strava_no_gear: {
    channels: ['push', 'inApp'],
    // Straight to the one ride that needs an answer, rather than to a list the
    // user then has to search.
    route: '/rides/pending/:activityId',
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
