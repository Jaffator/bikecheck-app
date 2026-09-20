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
  | 'achievement_unlocked'
  | 'new_follower'
  | 'follow_request'
  | 'follow_accepted';

export interface NotificationTypeConfig {
  channels: NotificationChannel[];
  route?: string;
  // Leads the push's title, so a push reads as what it is before a word of it does. Only
  // the push: the in-app list has its own icon, and the stored title stays clean.
  pushEmoji?: string;
  // Holds the bell badge until the user has actually dealt with it. Opening the list
  // does not touch one of these: looking at an ask is not the same as answering it.
  // Left off means the notification is an announcement, and seeing it is the whole job.
  holdsBadge?: boolean;
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
    // The ride itself, not the bike it landed on: the notification is about this one
    // ride, and the bike is a page away from it either way.
    route: '/rides?ride=:activityId',
    pushEmoji: '🚵',
  },
  // A ride the app could not put on a bike by itself — whether Strava sent no
  // gear at all, or gear that matches nothing here. Both leave the user with
  // the same job, so they are one notification rather than two: the rider is
  // not expected to keep gear tidy on Strava's side.
  // Keyed on the activity: one ask per ride, however many webhooks Strava sends for it.
  // The badge is counted from these, so a redelivery must not add to it.
  strava_activity_unassigned: {
    channels: ['push', 'inApp'],
    // Opens the Pending tab with this ride's sheet already up.
    route: '/rides?pending=:activityId',
    pushEmoji: '❓',
    // The only ask the app makes of the rider, so it is the only thing the badge counts
    // once the list has been read. Cleared by assigning the bike, not by looking.
    holdsBadge: true,
  },
  // Recurring by nature: the same job comes due again every season, so it belongs on
  // the lock screen and in the list, and never in an inbox.
  maintenance_due: {
    channels: ['push', 'inApp'],
    // No maintenance sub-screen exists yet; the bike itself is the closest
    // thing the app can actually open.
    route: '/bikes/:bikeId',
    pushEmoji: '🔧',
  },
  achievement_unlocked: {
    channels: ['inApp'],
  },
  // Someone followed a Public profile. In-app only: there is nothing to do about it. Keyed
  // on the follower, so one person is news once, however often they leave and come back.
  new_follower: {
    channels: ['inApp'],
    route: '/follows?tab=followers',
  },
  // An ask: pushes and holds the badge until answered. Keyed on the asker, so a repeat
  // after a withdrawal or a refusal is silent - the free brake on request spam.
  follow_request: {
    channels: ['push', 'inApp'],
    route: '/follows?tab=followers',
    pushEmoji: '👋',
    holdsBadge: true,
  },
  // The answer to an ask: pushes, nothing to do but open the garage. Keyed on the owner, so
  // one garage opening to a person is news once.
  follow_accepted: {
    channels: ['push', 'inApp'],
    route: '/users/:handle',
    pushEmoji: '✅',
  },
};

// The types opening the notification list marks read: everything that is not waiting on
// the user. Derived rather than listed, so a new type is covered by its own config.
export const CLEARED_ON_VIEW: NotificationType[] = (Object.keys(NOTIFICATION_CONFIG) as NotificationType[]).filter(
  (type) => !NOTIFICATION_CONFIG[type].holdsBadge,
);
