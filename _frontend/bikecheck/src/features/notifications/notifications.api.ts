// Notification API requests.
import { apiFetch } from "@/api/client";
import type { Notification } from "./notifications.types";

// Get notifications, optionally unread only.
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/notifications${unreadOnly ? "?unread=true" : ""}`);
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
