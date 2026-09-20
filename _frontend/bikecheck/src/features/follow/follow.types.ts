import type { ProfileRelation, ProfileVisibility } from "@/features/profile/profile.types";

// The relations a follows row stands in, from the follower's side: what the profile reads,
// less the two that need no row.
export type FollowRelation = Exclude<ProfileRelation, "SELF" | "NONE">;

// Mirrors ResponseFollowDto (POST /follows/:handle): the relation now standing, so the
// button flips without a refetch.
export interface FollowResponse {
  relation: FollowRelation;
}

// Where I stand with a person in a list: what the profile reads, less the one that is me.
export type FollowingRowRelation = Exclude<ProfileRelation, "SELF">;

// Mirrors FollowingRowDto: one person on my outgoing side - a search result or somebody I
// follow. visibility lets the following list mark a profile that went Off.
export interface FollowingRow {
  handle: string;
  name: string | null;
  avatar_url: string | null;
  visibility: ProfileVisibility;
  relation: FollowingRowRelation;
}

// Mirrors ResponseFollowSearchDto (GET /follows/search): the first 20, and whether more matched.
export interface FollowSearchResponse {
  results: FollowingRow[];
  capped: boolean;
}

// Mirrors the backend follow_status enum: a request waiting on me, or a follower.
export type FollowerStatus = "PENDING" | "ACCEPTED";

// Mirrors FollowerRowDto: one person on my incoming side. Keyed by user id, since a follower
// who never made a profile has no handle - handle is null then.
export interface FollowerRow {
  user_id: number;
  handle: string | null;
  name: string | null;
  avatar_url: string | null;
  status: FollowerStatus;
  created_at: string;
}
