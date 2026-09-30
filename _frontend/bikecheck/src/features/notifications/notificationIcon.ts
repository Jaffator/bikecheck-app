// What a notification row wears before a word of it is read.
import { CircleQuestionMark, TriangleAlert, UserCheck, UserPlus, Users } from "lucide-react";
import { PiPath } from "react-icons/pi";
import type { IconType } from "react-icons";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import type { Notification, NotificationPayload, NotificationType } from "./notifications.types";

// Rides mark for a ride, a question for the one ask the badge keeps counting, a warning in
// its band's colour for a reminder, people for follows.
export const NOTIFICATION_ICONS: Partial<Record<NotificationType, IconType>> = {
  strava_activity_saved: PiPath,
  strava_activity_unassigned: CircleQuestionMark,
  maintenance_due: TriangleAlert,
  new_follower: Users,
  follow_request: UserPlus,
  follow_accepted: UserCheck,
};

// Where each level begins, so the reminder wears the same colour the row on the card does.
const LEVEL_PERCENTAGE: Record<NonNullable<NotificationPayload["level"]>, number> = {
  warning: 75,
  critical: 90,
  overdue: 100,
};

// An unread reminder is coloured by its band; everything else follows the title's read state.
export function notificationIconColor(notification: Notification, unread: boolean): string {
  const level = notification.payload?.level;
  if (unread && level !== undefined) return attentionColor(LEVEL_PERCENTAGE[level]);
  return unread ? "var(--mantine-color-text-6)" : "var(--color-text-dim)";
}
