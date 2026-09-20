// Following through the shared authenticated client. Every route needs a session: the web
// page /u/* has no search and no follow control.
import { apiFetch } from "@/api/client";
import type { FollowResponse, FollowSearchResponse, FollowingRow } from "./follow.types";

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

// POST /follows/:handle — follow a Public profile; takes at once. 404 for Off, no profile
// and a dead handle alike, 400 for my own handle. A row that already stands is answered as is.
export async function followUser(handle: string): Promise<FollowResponse> {
  return apiFetch<FollowResponse>(`/follows/${encodeURIComponent(handle)}`, { method: "POST" });
}

// DELETE /follows/:handle — stop following. 204 whether or not a row stood.
export async function unfollowUser(handle: string): Promise<void> {
  await apiFetch<void>(`/follows/${encodeURIComponent(handle)}`, { method: "DELETE" });
}
