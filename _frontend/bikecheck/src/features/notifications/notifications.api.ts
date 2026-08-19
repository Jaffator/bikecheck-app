// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend routes are under "/notifications" (see notification.controller.ts).
import { apiFetch } from "@/api/client";
import type { Notification } from "./notifications.types";

// GET /notifications — newest first. Pass true for the unread ones only.
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/notifications${unreadOnly ? "?unread=true" : ""}`);
}

// PATCH /notifications/:id/read — marks one as read.
export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" });
}

// POST /notifications/fcm-token — registers this device for push.
export async function registerFcmToken(token: string, platform: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/notifications/fcm-token", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}
