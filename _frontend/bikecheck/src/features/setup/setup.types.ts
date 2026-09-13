import type { components } from "@/api/schema";

// Mirrors Response_SetupProfileDto. Hand-written rather than generated: the schema types every
// nullable number as Record<string, never>. Everything is psi - tyres are converted to the owner's
// Tyre Pressure Unit on the screen (ADR 0029). Null was never written down; zero is a real zero.
export interface SetupProfile {
  id: number;
  bike_id: number;
  name: string;
  note: string | null;
  front_tire_psi: number | null;
  rear_tire_psi: number | null;
  fork_pressure_psi: number | null;
  fork_tokens: number | null;
  fork_sag_percent: number | null;
  // Clicks from fully closed, on every adjuster.
  fork_rebound_ls: number | null;
  fork_rebound_hs: number | null;
  fork_compression_ls: number | null;
  fork_compression_hs: number | null;
  shock_pressure_psi: number | null;
  shock_tokens: number | null;
  shock_sag_percent: number | null;
  shock_rebound_ls: number | null;
  shock_rebound_hs: number | null;
  shock_compression_ls: number | null;
  shock_compression_hs: number | null;
  created_at: string;
  updated_at: string;
}

// A new profile: blank, or a copy of another profile of the same bike. Numbers come by PATCH.
export type CreateSetupProfilePayload = components["schemas"]["CreateSetupProfileDto"];

// Mirrors UpdateSetupProfileDto: a field sent as null clears it, a field left out is untouched.
export type UpdateSetupProfilePayload = Partial<Omit<SetupProfile, "id" | "bike_id" | "created_at" | "updated_at">>;
