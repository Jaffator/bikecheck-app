import type { TirePressureUnit } from "@/features/users/users.types";

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

// Where the viewer stands with the owner. Follow (PRD 2) adds PENDING and FOLLOWING.
export type ProfileRelation = "SELF" | "NONE";

// Mirrors ProfileOwnerDto: the owner as the page names them, nothing else of the account.
export interface ProfileOwner {
  handle: string;
  name: string | null;
  avatar_url: string | null;
}

export interface ProfileShares {
  components: boolean;
  setup: boolean;
  history: boolean;
  costs: boolean;
}

// Over the listed bikes only. A count is null when its section is off.
export interface ProfileTotals {
  bikes: number;
  distance_km: number;
  components: number | null;
  services: number | null;
}

export interface ProfileBikeType {
  i18n_key: string | null;
  name: string;
}

// Mirrors ProfileBikeCardDto: one card on somebody's garage page.
export interface ProfileBikeCard {
  id: number;
  // The nickname its owner gave it.
  name: string | null;
  brand: string;
  model: string | null;
  year: number | null;
  type: ProfileBikeType | null;
  image_url: string | null;
  distance_km: number;
  components: number | null;
  services: number | null;
}

// Mirrors ProfileGarageDto. updated_at is Last Updated; the units are the owner's.
export interface ProfileGarage {
  updated_at: string;
  shares: ProfileShares;
  totals: ProfileTotals;
  currency: string;
  tire_pressure_unit: TirePressureUnit;
  bikes: ProfileBikeCard[];
}

// Mirrors ResponseProfileGarageDto (GET /profiles/:handle): always the header, the garage
// only when the read rule allows. OFF reaches nobody but the owner's own preview.
export interface ProfileGarageResponse {
  owner: ProfileOwner;
  visibility: ProfileVisibility;
  relation: ProfileRelation;
  garage: ProfileGarage | null;
}
