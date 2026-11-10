// When a notification arrived, as both lists group and stamp it.
import dayjs from "dayjs";
import type { Notification } from "./notifications.types";

export type NotificationDay = "today" | "yesterday" | "week" | "month" | "earlier";

export interface NotificationGroup {
  day: NotificationDay;
  notifications: Notification[];
}

// By the user's local calendar day, so a 23:59 ride is yesterday one minute after midnight.
// Week and month count back seven and thirty days from today, not calendar weeks.
export function notificationDay(createdAt: string, now: Date = new Date()): NotificationDay {
  const created = dayjs(createdAt);
  const daysAgo = dayjs(now).startOf("day").diff(created.startOf("day"), "day");
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo <= 7) return "week";
  if (daysAgo <= 30) return "month";
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

// Today counts back in minutes, then hours; yesterday by the clock, anything older by weekday and date.
export function notificationTime(createdAt: string, day: NotificationDay, now: Date = new Date()): string {
  const created = dayjs(createdAt);
  if (day === "yesterday") return created.format("HH:mm");
  if (day !== "today") return created.format("ddd D. M.");

  const minutes = dayjs(now).diff(created, "minute");
  return minutes < 60 ? `${Math.max(minutes, 1)} min` : `${Math.floor(minutes / 60)} h`;
}
