// Notification API requests.
import { apiFetch } from "@/api/client";
import type { Notification } from "./notifications.types";

// One page of notifications, newest first and older than `before`.
export async function getNotifications(limit: number, before?: number): Promise<Notification[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (before !== undefined) query.set("before", String(before));
  return apiFetch<Notification[]>(`/notifications?${query.toString()}`);
}

// Every unread notification; the server does not page these.
export async function getUnreadNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>("/notifications?unread=true");
}

// Mark everything the list clears on view as read.
export async function markNotificationsViewed(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/notifications/viewed", { method: "PATCH" });
}

// Mark a notification as read.
export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" });
}

// Register an FCM device token.
export async function registerFcmToken(token: string, platform: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/notifications/fcm-token", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}
