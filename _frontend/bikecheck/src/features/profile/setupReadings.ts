// The four numbers of a Setup Profile read as gauges, for whoever draws somebody's Setup:
// tyres in the owner's unit with the other unit under them, suspension always psi (ADR 0029)
// with its sag folded under the pressure.
import {
  PRESSURE_DECIMALS,
  SUSPENSION_PSI_MAX,
  TYRE_PRESSURE_MAX,
  fromPsi,
  otherUnitReading,
} from "@/features/setup/pressure";
import type { TirePressureUnit } from "@/features/users/users.types";
import type { SeededRowName } from "@/i18n/useSeededName";
import type { ProfileLeg, ProfileMountedPart, ProfileSetupProfile } from "./profile.types";

// Suspension pressure is read to a tenth of a psi, as the sheet accepts it.
const SUSPENSION_PSI_DECIMALS = 1;
// A number the owner never wrote down.
export const NO_READING = "—";

// The seeded part each gauge stands for, as the rest of the app draws it.
export type PartIcon = "Tire" | "Fork" | "Shock";

// One number of the sheet as a gauge: the part over the arc, the figure already in the
// reader's unit, and under it what else may be known of the part - the tyre mounted.
export interface GaugeReading {
  key: string;
  label: string;
  icon: PartIcon;
  value: number | null;
  max: number;
  figure: string;
  unit: string;
  hint?: string;
  under?: string;
}

type Translate = (key: string) => string;

function formatFigure(value: number, decimals: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: decimals }).format(value);
}

// The tyre under the pressure: what the owner called it, else what kind of part it is.
function mountedName(tyre: ProfileMountedPart, seededName: SeededRowName): string {
  const described = tyre.description?.trim();
  return described !== undefined && described !== "" ? described : seededName(tyre.type.i18n_key, tyre.type.name);
}

// A tyre reads in the owner's unit with the other unit small under it; the arc runs to the
// same ceiling the sheet's slider does.
function tyreReading(
  key: string,
  label: string,
  psi: number | null,
  tyre: ProfileMountedPart | null,
  unit: TirePressureUnit,
  language: string,
  seededName: SeededRowName,
): GaugeReading {
  const value = fromPsi(psi, unit);
  return {
    key,
    label,
    icon: "Tire",
    value: psi,
    max: TYRE_PRESSURE_MAX.psi,
    figure: value === null ? NO_READING : formatFigure(value, PRESSURE_DECIMALS[unit], language),
    unit,
    hint: value === null ? undefined : otherUnitReading(value, unit),
    under: tyre === null ? undefined : mountedName(tyre, seededName),
  };
}

// A leg is one gauge: its pressure, always psi, with the sag as the second reading under it.
function legReading(key: "fork" | "shock", leg: ProfileLeg, language: string, t: Translate): GaugeReading {
  return {
    key: `${key}-pressure`,
    label: key === "fork" ? t("setup.fork") : t("setup.shock"),
    icon: key === "fork" ? "Fork" : "Shock",
    value: leg.pressure_psi,
    max: SUSPENSION_PSI_MAX,
    figure: leg.pressure_psi === null ? NO_READING : formatFigure(leg.pressure_psi, SUSPENSION_PSI_DECIMALS, language),
    unit: "psi",
    hint: leg.sag_percent === null ? undefined : `${t("setup.sag")} ${leg.sag_percent} %`,
  };
}

// The gauges of one profile in the sheet's order: both tyres, then whichever legs the bike has.
export function gaugeReadings(
  profile: ProfileSetupProfile,
  unit: TirePressureUnit,
  language: string,
  t: Translate,
  seededName: SeededRowName,
): GaugeReading[] {
  return [
    tyreReading("front-tyre", t("sharing.gaugeFrontTyre"), profile.front_tire_psi, profile.front_tire, unit, language, seededName),
    tyreReading("rear-tyre", t("sharing.gaugeRearTyre"), profile.rear_tire_psi, profile.rear_tire, unit, language, seededName),
    ...(profile.fork === null ? [] : [legReading("fork", profile.fork, language, t)]),
    ...(profile.shock === null ? [] : [legReading("shock", profile.shock, language, t)]),
  ];
}
