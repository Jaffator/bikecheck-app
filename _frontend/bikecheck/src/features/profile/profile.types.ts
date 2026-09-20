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

// Mirrors ResponsePublicProfileGarageDto (GET /profiles/public/:handle): the same shape with
// the garage always on it - whatever the web rule closes is a 404, never a header.
export interface PublicProfileGarageResponse extends ProfileGarageResponse {
  garage: ProfileGarage;
}

// A catalogue entry: the key to translate, the stored name when it is the owner's own.
export interface ProfileCatalogueName {
  i18n_key: string | null;
  name: string;
}

// Mirrors ProfileMountedPartDto: one part as a reader may know it. Wear is since mounted;
// null means nothing on record.
export interface ProfileMountedPart {
  id: number;
  type: ProfileCatalogueName;
  description: string | null;
  position: string | null;
  distance_km: number | null;
  time_min: number | null;
}

export interface ProfileComponentGroup {
  category: ProfileCatalogueName;
  parts: ProfileMountedPart[];
}

// Clicks from fully closed on every adjuster (ADR 0029).
export interface ProfileClicks {
  rebound_ls: number | null;
  rebound_hs: number | null;
  compression_ls: number | null;
  compression_hs: number | null;
}

// One leg of the suspension, always in psi.
export interface ProfileLeg {
  pressure_psi: number | null;
  sag_percent: number | null;
  tokens: number | null;
  clicks: ProfileClicks;
}

// Mirrors ProfileSetupProfileDto. Tyres in psi - the page converts to the owner's unit;
// the mounted tyre under each only while components are shared; a leg only per suspension.
export interface ProfileSetupProfile {
  id: number;
  name: string;
  is_active: boolean;
  front_tire_psi: number | null;
  rear_tire_psi: number | null;
  front_tire: ProfileMountedPart | null;
  rear_tire: ProfileMountedPart | null;
  fork: ProfileLeg | null;
  shock: ProfileLeg | null;
}

// A sum in the owner's currency, written for the reader's language by the money formatter.
export interface ProfileMoney {
  amount: number;
  currency: string;
}

// Mirrors ProfileServiceDto: one Service as a reader may know it. The cost is there only
// with costs shared and a price written down - absent otherwise, never null.
export interface ProfileService {
  id: number;
  // Service Date; null for work the owner never dated.
  date: string | null;
  is_replacement: boolean;
  actions: ProfileCatalogueName[];
  // Component types touched, each once.
  parts: ProfileCatalogueName[];
  cost?: ProfileMoney;
}

// History Totals over the whole record; spend only with costs shared.
export interface ProfileHistoryTotals {
  services: number;
  replacements: number;
  spend?: ProfileMoney;
}

// Mirrors ProfileHistoryDto: the totals and the first page, newest first, undated last.
export interface ProfileHistory {
  totals: ProfileHistoryTotals;
  services: ProfileService[];
  total_count: number;
}

// Mirrors ResponseProfileServicesDto (GET /profiles/:handle/bikes/:id/services): older Services.
export interface ProfileServicesPage {
  services: ProfileService[];
  total_count: number;
}

// Mirrors ProfileBikeDto: the card plus what the hero reads and the sections the switches let
// out. A section that is off is null; setup [] is a bike with no profile yet. The build
// stands where the card's parts count was.
export interface ProfileBike extends Omit<ProfileBikeCard, "components"> {
  // Last Updated of this bike alone: the newest of the bike, its parts and its Services.
  updated_at: string;
  time_min: number;
  ebike: boolean;
  frame_material: string | null;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
  components: ProfileComponentGroup[] | null;
  setup: ProfileSetupProfile[] | null;
  history: ProfileHistory | null;
}

// Mirrors ResponseProfileBikeDto (GET /profiles/:handle/bikes/:id). No header exception:
// whatever is not readable is a 404.
export interface ProfileBikeResponse {
  owner: ProfileOwner;
  visibility: ProfileVisibility;
  relation: ProfileRelation;
  currency: string;
  tire_pressure_unit: TirePressureUnit;
  bike: ProfileBike;
}
