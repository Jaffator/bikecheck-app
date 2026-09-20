// Public Profile settings through the shared authenticated client.
import { apiFetch } from "@/api/client";
import type {
  Profile,
  ProfileBikeResponse,
  ProfileGarageResponse,
  ProfileServicesPage,
  PublicProfileGarageResponse,
  UpdateProfilePayload,
} from "./profile.types";

// GET /profiles/me — the owner's settings; the OFF defaults and a suggested handle while no
// row exists. Reads only: nothing is written until the drawer confirms.
export async function getMyProfile(): Promise<Profile> {
  return apiFetch<Profile>("/profiles/me");
}

// PATCH /profiles/me — upserts any subset. 400 with a HANDLE_* reason for a handle the rule
// refuses, 409 HANDLE_TAKEN for one another account holds.
export async function updateMyProfile(payload: UpdateProfilePayload): Promise<Profile> {
  return apiFetch<Profile>("/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// GET /profiles/:handle — somebody's garage as the app draws it. 404 for Off, no profile
// and a dead handle alike; the owner reads their own in every state.
export async function getProfileGarage(handle: string): Promise<ProfileGarageResponse> {
  return apiFetch<ProfileGarageResponse>(`/profiles/${encodeURIComponent(handle)}`);
}

// GET /profiles/public/:handle — the garage for the web page, no session behind it. Open only
// while PUBLIC; Off, followers only and a dead handle are one 404. Every call counts a view.
export async function getPublicProfileGarage(handle: string): Promise<PublicProfileGarageResponse> {
  return apiFetch<PublicProfileGarageResponse>(`/profiles/public/${encodeURIComponent(handle)}`);
}

// GET /profiles/:handle/bikes/:id — one of somebody's bikes. 404 for a profile the rule
// closes and for a bike that is unknown, unshared or archived alike.
export async function getProfileBike(handle: string, bikeId: number): Promise<ProfileBikeResponse> {
  return apiFetch<ProfileBikeResponse>(`/profiles/${encodeURIComponent(handle)}/bikes/${String(bikeId)}`);
}

// GET /profiles/:handle/bikes/:id/services — the Services the bike page did not carry, from
// the offset. The same 404s as the bike, and one more for a history the owner keeps in.
export async function getProfileBikeServices(handle: string, bikeId: number, offset: number): Promise<ProfileServicesPage> {
  const params = new URLSearchParams({ offset: String(offset) });
  return apiFetch<ProfileServicesPage>(
    `/profiles/${encodeURIComponent(handle)}/bikes/${String(bikeId)}/services?${params.toString()}`,
  );
}

// GET /profiles/public/:handle/bikes/:id — one bike for the web page, no session behind it.
// Open only while PUBLIC; a closed profile and a hidden bike are one 404. Counts no view.
export async function getPublicProfileBike(handle: string, bikeId: number): Promise<ProfileBikeResponse> {
  return apiFetch<ProfileBikeResponse>(`/profiles/public/${encodeURIComponent(handle)}/bikes/${String(bikeId)}`);
}

// GET /profiles/public/:handle/bikes/:id/services — the Services the web bike page did not
// carry, from the offset. The same 404s as the bike, and one more for a history kept in.
export async function getPublicProfileBikeServices(
  handle: string,
  bikeId: number,
  offset: number,
): Promise<ProfileServicesPage> {
  const params = new URLSearchParams({ offset: String(offset) });
  return apiFetch<ProfileServicesPage>(
    `/profiles/public/${encodeURIComponent(handle)}/bikes/${String(bikeId)}/services?${params.toString()}`,
  );
}
