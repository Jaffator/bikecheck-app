// When a notification arrived, as the desktop list groups and stamps it.
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Notification } from "./notifications.types";

dayjs.extend(relativeTime);

export type NotificationDay = "today" | "yesterday" | "earlier";

export interface NotificationGroup {
  day: NotificationDay;
  notifications: Notification[];
}

// By the user's local calendar day, so a 23:59 ride is yesterday one minute after midnight.
export function notificationDay(createdAt: string, now: Date = new Date()): NotificationDay {
  const created = dayjs(createdAt);
  if (created.isSame(now, "day")) return "today";
  if (created.isSame(dayjs(now).subtract(1, "day"), "day")) return "yesterday";
  return "earlier";
}

// Keeps the list's order: newest first in, newest first out.
export function groupByDay(notifications: Notification[], now: Date = new Date()): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  for (const notification of notifications) {
    const day = notificationDay(notification.created_at, now);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.notifications.push(notification);
    else groups.push({ day, notifications: [notification] });
  }
  return groups;
}

// Today reads relative, yesterday by the clock, anything older by weekday and date.
export function notificationTime(createdAt: string, day: NotificationDay): string {
  const created = dayjs(createdAt);
  if (day === "today") return created.fromNow();
  if (day === "yesterday") return created.format("HH:mm");
  return created.format("ddd D. M.");
}
