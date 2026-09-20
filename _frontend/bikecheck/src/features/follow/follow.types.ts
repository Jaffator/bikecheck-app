import type { ProfileRelation } from "@/features/profile/profile.types";

// The relations a follows row stands in, from the follower's side: what the profile reads,
// less the two that need no row.
export type FollowRelation = Exclude<ProfileRelation, "SELF" | "NONE">;

// Mirrors ResponseFollowDto (POST /follows/:handle): the relation now standing, so the
// button flips without a refetch.
export interface FollowResponse {
  relation: FollowRelation;
}
