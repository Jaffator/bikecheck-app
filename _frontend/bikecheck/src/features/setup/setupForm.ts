// What the Setup screen holds while it is being edited, and how it maps onto a profile. Every
// number may be null: empty is "not recorded", never zero. Tyres are in the owner's Tyre
// Pressure Unit here and in psi on the profile; suspension is psi on both sides (ADR 0029).
import type { TirePressureUnit } from "@/features/users/users.types";
import type { CompressionRing, ReboundRing } from "./dial.types";
import { TYRE_PRESSURE_START, fromPsi, toPsi } from "./pressure";
import type { SetupProfile, UpdateSetupProfilePayload } from "./setup.types";

// Where a number stands before the owner has written it: a starting point the sheet shows from
// the first look, saved with the profile the first time the sheet is saved. Clicks have none.
// A shock runs far higher than a fork, so each starts where its own pump would.
export const FORK_PSI_START = 70;
export const SHOCK_PSI_START = 120;
export const SAG_START = 15;
export const TOKENS_START = 0;

export interface SetupFormValues {
  // Tyres, in the owner's unit.
  front_tire: number | null;
  rear_tire: number | null;
  fork_pressure_psi: number | null;
  fork_tokens: number | null;
  fork_sag_percent: number | null;
  shock_pressure_psi: number | null;
  shock_tokens: number | null;
  shock_sag_percent: number | null;
  // Clicks from fully closed on every adjuster; null was never written down, zero is fully closed.
  fork_rebound_hs: number | null;
  fork_rebound_ls: number | null;
  fork_compression_hs: number | null;
  fork_compression_ls: number | null;
  shock_rebound_hs: number | null;
  shock_rebound_ls: number | null;
  shock_compression_hs: number | null;
  shock_compression_ls: number | null;
  note: string;
}

export type SetupSuspension = "fork" | "shock";
export type Adjuster = ReboundRing | CompressionRing;
// The four click counts of one section, keyed the way its dials name their rings.
export type SuspensionClicks = Record<Adjuster, number | null>;

type ClickField = Extract<keyof SetupFormValues, `${SetupSuspension}_${"rebound" | "compression"}_${"hs" | "ls"}`>;

const CLICK_FIELDS: Record<SetupSuspension, Record<Adjuster, ClickField>> = {
  fork: { hsr: "fork_rebound_hs", lsr: "fork_rebound_ls", hsc: "fork_compression_hs", lsc: "fork_compression_ls" },
  shock: { hsr: "shock_rebound_hs", lsr: "shock_rebound_ls", hsc: "shock_compression_hs", lsc: "shock_compression_ls" },
};

// Which field one adjuster of a section is held in.
export function clickField(section: SetupSuspension, ring: Adjuster): ClickField {
  return CLICK_FIELDS[section][ring];
}

// The click counts of one section, as its dials read them.
export function sectionClicks(values: SetupFormValues, section: SetupSuspension): SuspensionClicks {
  const fields = CLICK_FIELDS[section];
  return { hsr: values[fields.hsr], lsr: values[fields.lsr], hsc: values[fields.hsc], lsc: values[fields.lsc] };
}

// A profile as the form reads it; what was never written stands at its starting point.
export function toSetupForm(profile: SetupProfile | null, unit: TirePressureUnit): SetupFormValues {
  return {
    front_tire: fromPsi(profile?.front_tire_psi ?? null, unit) ?? TYRE_PRESSURE_START[unit],
    rear_tire: fromPsi(profile?.rear_tire_psi ?? null, unit) ?? TYRE_PRESSURE_START[unit],
    fork_pressure_psi: profile?.fork_pressure_psi ?? FORK_PSI_START,
    fork_tokens: profile?.fork_tokens ?? TOKENS_START,
    fork_sag_percent: profile?.fork_sag_percent ?? SAG_START,
    shock_pressure_psi: profile?.shock_pressure_psi ?? SHOCK_PSI_START,
    shock_tokens: profile?.shock_tokens ?? TOKENS_START,
    shock_sag_percent: profile?.shock_sag_percent ?? SAG_START,
    fork_rebound_hs: profile?.fork_rebound_hs ?? null,
    fork_rebound_ls: profile?.fork_rebound_ls ?? null,
    fork_compression_hs: profile?.fork_compression_hs ?? null,
    fork_compression_ls: profile?.fork_compression_ls ?? null,
    shock_rebound_hs: profile?.shock_rebound_hs ?? null,
    shock_rebound_ls: profile?.shock_rebound_ls ?? null,
    shock_compression_hs: profile?.shock_compression_hs ?? null,
    shock_compression_ls: profile?.shock_compression_ls ?? null,
    note: profile?.note ?? "",
  };
}

// Every field the sheet owns; a click count is saved as counted, however far past the dial's drawn range.
export function toSetupPayload(values: SetupFormValues, unit: TirePressureUnit): UpdateSetupProfilePayload {
  const note = values.note.trim();
  return {
    front_tire_psi: toPsi(values.front_tire, unit),
    rear_tire_psi: toPsi(values.rear_tire, unit),
    fork_pressure_psi: values.fork_pressure_psi,
    fork_tokens: values.fork_tokens,
    fork_sag_percent: values.fork_sag_percent,
    shock_pressure_psi: values.shock_pressure_psi,
    shock_tokens: values.shock_tokens,
    shock_sag_percent: values.shock_sag_percent,
    fork_rebound_hs: values.fork_rebound_hs,
    fork_rebound_ls: values.fork_rebound_ls,
    fork_compression_hs: values.fork_compression_hs,
    fork_compression_ls: values.fork_compression_ls,
    shock_rebound_hs: values.shock_rebound_hs,
    shock_rebound_ls: values.shock_rebound_ls,
    shock_compression_hs: values.shock_compression_hs,
    shock_compression_ls: values.shock_compression_ls,
    note: note === "" ? null : note,
  };
}

// Whether anything differs from what the profile says.
export function isSetupDirty(values: SetupFormValues, baseline: SetupFormValues): boolean {
  return (Object.keys(baseline) as (keyof SetupFormValues)[]).some((key) => values[key] !== baseline[key]);
}
