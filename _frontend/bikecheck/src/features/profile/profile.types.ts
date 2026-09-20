// Mirrors the backend profile_visibility enum: nobody, approved followers, anyone at the address.
export const PROFILE_VISIBILITIES = ["OFF", "FOLLOWERS", "PUBLIC"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

// Mirrors ProfileStatsDto. Followers and requests read 0 until Follow lands (PRD 2).
export interface ProfileStats {
  views: number;
  followers: number;
  pending_requests: number;
}

// Mirrors ResponseProfileDto (profile/dto/response-profile.dto.ts). Without a row yet the
// handle is null, the rest are the OFF defaults and suggested_handle is set.
export interface Profile {
  handle: string | null;
  visibility: ProfileVisibility;
  share_components: boolean;
  share_setup: boolean;
  share_history: boolean;
  share_costs: boolean;
  stats: ProfileStats;
  suggested_handle: string | null;
  // The address is `${public_origin}/u/${handle}`.
  public_origin: string;
}

// Mirrors UpdateProfileDto; any subset.
export interface UpdateProfilePayload {
  handle?: string;
  visibility?: ProfileVisibility;
  share_components?: boolean;
  share_setup?: boolean;
  share_history?: boolean;
  share_costs?: boolean;
}

// What PATCH /profiles/me refuses a handle with: 400 for the rule, 409 HANDLE_TAKEN.
export const HANDLE_ERROR_CODES = [
  "HANDLE_TOO_SHORT",
  "HANDLE_TOO_LONG",
  "HANDLE_INVALID_CHARS",
  "HANDLE_LEADING_DASH",
  "HANDLE_RESERVED",
  "HANDLE_TAKEN",
] as const;
export type HandleErrorCode = (typeof HANDLE_ERROR_CODES)[number];

export interface SharedBikeChange {
  id: number;
  is_shared: boolean;
}

// One confirm in the share drawer: the settings, and every bike whose share switch moved.
export interface SaveSharingInput {
  profile: UpdateProfilePayload;
  bikes: SharedBikeChange[];
}
