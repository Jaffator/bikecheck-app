export type NotificationChannel = 'push' | 'email' | 'inApp';

export type NotificationType = 'strava_unmatched_gear' | 'strava_no_gear' | 'maintenance_due' | 'achievement_unlocked';

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
  strava_unmatched_gear: {
    channels: ['push', 'inApp'],
    route: '/bikes/:bikeId/strava-link',
  },
  strava_no_gear: {
    channels: ['push', 'inApp'],
  },
  maintenance_due: {
    channels: ['push', 'email', 'inApp'],
    route: '/bikes/:bikeId/maintenance',
  },
  achievement_unlocked: {
    channels: ['inApp'],
  },
};
