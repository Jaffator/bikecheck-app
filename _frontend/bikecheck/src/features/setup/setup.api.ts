// Access Setup Profile endpoints through the shared authenticated API client.
import { apiFetch } from "@/api/client";
import type { CreateSetupProfilePayload, SetupProfile, UpdateSetupProfilePayload } from "./setup.types";

// GET /setup/bike/:bikeId — the bike's profiles, oldest first.
export async function getSetupProfiles(bikeId: number): Promise<SetupProfile[]> {
  return apiFetch<SetupProfile[]>(`/setup/bike/${String(bikeId)}`);
}

// POST /setup/bike/:bikeId — a new profile, blank or copied from another of the same bike.
export async function createSetupProfile(bikeId: number, payload: CreateSetupProfilePayload): Promise<SetupProfile> {
  return apiFetch<SetupProfile>(`/setup/bike/${String(bikeId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// PATCH /setup/:id — rewrites the profile in place; there is no history behind it (ADR 0029).
export async function updateSetupProfile(id: number, payload: UpdateSetupProfilePayload): Promise<SetupProfile> {
  return apiFetch<SetupProfile>(`/setup/${String(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// DELETE /setup/:id — removes a profile, the last one included.
export async function deleteSetupProfile(id: number): Promise<SetupProfile> {
  return apiFetch<SetupProfile>(`/setup/${String(id)}`, { method: "DELETE" });
}
