// Following through the shared authenticated client. Every route needs a session: the web
// page /u/* has no follow control.
import { apiFetch } from "@/api/client";
import type { FollowResponse } from "./follow.types";

// POST /follows/:handle — follow a Public profile; takes at once. 404 for Off, no profile
// and a dead handle alike, 400 for my own handle. A row that already stands is answered as is.
export async function followUser(handle: string): Promise<FollowResponse> {
  return apiFetch<FollowResponse>(`/follows/${encodeURIComponent(handle)}`, { method: "POST" });
}

// DELETE /follows/:handle — stop following. 204 whether or not a row stood.
export async function unfollowUser(handle: string): Promise<void> {
  await apiFetch<void>(`/follows/${encodeURIComponent(handle)}`, { method: "DELETE" });
}
