// Tyre pressure between the psi the API stores and the unit the owner reads (ADR 0029).
// Suspension pressure never passes through here: a fork or shock is always read in psi.
import type { TirePressureUnit } from "@/features/users/users.types";

const PSI_PER_BAR = 14.5037738;

// How many decimals each unit is read to: 1.8 bar, 26 psi.
export const PRESSURE_DECIMALS: Record<TirePressureUnit, number> = {
  bar: 1,
  psi: 0,
};

// Where the tyre slider ends: 8 bar, or the same pressure in psi. No tyre on a bike goes higher.
export const TYRE_PRESSURE_MAX: Record<TirePressureUnit, number> = {
  bar: 8,
  psi: 116,
};

// One notch of the tyre buttons - the smallest number each unit is read to.
export const TYRE_PRESSURE_STEP: Record<TirePressureUnit, number> = {
  bar: 0.1,
  psi: 1,
};

// Where a tyre stands before the owner has written it: 1 bar, or the same in psi.
export const TYRE_PRESSURE_START: Record<TirePressureUnit, number> = { bar: 1, psi: 15 };

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// A stored psi as the owner reads it. Null stays null: nothing was recorded.
export function fromPsi(psi: number | null, unit: TirePressureUnit): number | null {
  if (psi === null) return null;
  const value = unit === "bar" ? psi / PSI_PER_BAR : psi;
  return round(value, PRESSURE_DECIMALS[unit]);
}

// What the owner typed, as the psi the API stores - to one decimal, which is what it accepts.
export function toPsi(value: number | null, unit: TirePressureUnit): number | null {
  if (value === null) return null;
  return round(unit === "bar" ? value * PSI_PER_BAR : value, 1);
}

// The same tyre pressure as the other unit reads it - "(26 psi)" under a bar figure.
export function otherUnitReading(value: number, unit: TirePressureUnit): string {
  if (unit === "bar") return `(${fromPsi(toPsi(value, "bar"), "psi")} psi)`;
  return `(${fromPsi(value, "bar")} bar)`;
}
