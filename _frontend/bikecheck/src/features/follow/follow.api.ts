// Following through the shared authenticated client. Every route needs a session: the web
// page /u/* has no search and no follow control.
import { apiFetch } from "@/api/client";
import type { FollowResponse, FollowSearchResponse, FollowerRow, FollowingRow } from "./follow.types";

// GET /follows/search?q= — Discoverable riders by handle prefix or a word of their name, the
// first 20. 400 under 2 or over 50 characters; the field never sends those.
export async function searchPeople(query: string): Promise<FollowSearchResponse> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<FollowSearchResponse>(`/follows/search?${params.toString()}`);
}

// GET /follows/following — whom I follow and whom I asked, one list ordered by name.
export async function getFollowing(): Promise<FollowingRow[]> {
  return apiFetch<FollowingRow[]>("/follows/following");
}

// POST /follows/:handle — follow a Public profile at once, or ask to follow a Followers-only
// one. 404 for Off, no profile and a dead handle alike, 400 for my own handle. A row that
// already stands is answered as is.
export async function followUser(handle: string): Promise<FollowResponse> {
  return apiFetch<FollowResponse>(`/follows/${encodeURIComponent(handle)}`, { method: "POST" });
}

// DELETE /follows/:handle — withdraw a request or stop following. 204 whether or not a row stood.
export async function unfollowUser(handle: string): Promise<void> {
  await apiFetch<void>(`/follows/${encodeURIComponent(handle)}`, { method: "DELETE" });
}

// GET /follows/followers — who asked me and who follows me, one list ordered by name. The
// incoming side is keyed by user id: a follower may have no handle.
export async function getFollowers(): Promise<FollowerRow[]> {
  return apiFetch<FollowerRow[]>("/follows/followers");
}

// POST /follows/followers/:userId/accept — accept a request. 404 with no request waiting.
export async function acceptFollower(userId: number): Promise<void> {
  await apiFetch<void>(`/follows/followers/${String(userId)}/accept`, { method: "POST" });
}

// DELETE /follows/followers/:userId — decline a request or remove a follower. 204 either way.
export async function removeFollower(userId: number): Promise<void> {
  await apiFetch<void>(`/follows/followers/${String(userId)}`, { method: "DELETE" });
}
