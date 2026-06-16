export type NotificationChannel = 'push' | 'email' | 'inApp';

export type NotificationType = 'strava_unmatched_activity' | 'maintenance_due' | 'achievement_unlocked';

export interface NotificationTypeConfig {
  channels: NotificationChannel[];
  route?: string;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  strava_unmatched_activity: {
    channels: ['push', 'inApp'],
    route: '/bikes/:bikeId/strava-link',
  },
  maintenance_due: {
    channels: ['push', 'email', 'inApp'],
    route: '/bikes/:bikeId/maintenance',
  },
  achievement_unlocked: {
    channels: ['inApp'],
  },
};
