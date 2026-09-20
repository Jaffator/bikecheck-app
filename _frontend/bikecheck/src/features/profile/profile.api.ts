// Public Profile settings through the shared authenticated client.
import { apiFetch } from "@/api/client";
import type { Profile, ProfileGarageResponse, UpdateProfilePayload } from "./profile.types";

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
