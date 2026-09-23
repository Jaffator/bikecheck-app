// The numbers behind a reading, in the unit it is taken in. One place, because the figure on
// screen and the figure the interval field is typed in have to speak the same unit.
import type { TrackedAction, WearAxis } from "./tracking.types";

// The unit one axis is read and typed in. Minutes read as hours, the unit the rest of the
// app gives ride time in; a wear index has none an owner could hold, so it is named instead.
export function axisUnit(axis: WearAxis): string {
  if (axis === "km") return "km";
  if (axis === "min") return "h";
  return "";
}

// One stored figure in that unit, as a number — what the interval field holds.
export function inAxisUnit(axis: WearAxis, value: number): number {
  return axis === "min" ? Math.round(value / 60) : value;
}

// Back the other way: what the field writes down, in the unit the reading is taken in.
export function fromAxisUnit(axis: WearAxis, value: number): number {
  return axis === "min" ? value * 60 : value;
}

// One figure written out, with its thousands grouped the way the owner's language groups
// them. Without the unit, so a pair of figures can share one.
export function axisValue(axis: WearAxis, value: number, language: string): string {
  return new Intl.NumberFormat(language).format(inAxisUnit(axis, value));
}

// The Service Interval in force before any Extension: the owner's own where they set one.
// `interval` is that plus the Extension, so neither can be read off the other.
export function intervalInForce(action: TrackedAction): number {
  return action.interval_override ?? action.default_interval;
}

// What is left of the interval. Never below zero: an overdue reading has nothing left, and
// the percentage beside it is what says how far past due it is.
export function remainingWear(action: TrackedAction): number {
  return Math.max(0, action.interval - action.current);
}

// A tenth of the bike's own plan, which is what one tap of − or + moves the Service
// Interval by. Taken from the plan and never from the value on screen, so − undoes exactly
// what + did however many taps deep — a step off the current value would not come back.
const INTERVAL_STEP_SHARE = 0.1;

// Hours step in fives, and never by less than five. The field holds whole hours, so a step
// of 3.5 h would show rounded and store exact, and the two would drift apart on the next
// save.
const HOUR_STEP_ROUNDING = 5;

export function intervalStep(action: TrackedAction): number {
  const tenth = action.default_interval * INTERVAL_STEP_SHARE;

  if (action.axis === "min") {
    const hours = Math.round(tenth / 60 / HOUR_STEP_ROUNDING) * HOUR_STEP_ROUNDING;
    return Math.max(HOUR_STEP_ROUNDING, hours) * 60;
  }

  return Math.max(1, Math.round(tenth));
}

// How far the interval in force departs from the bike's plan, in whole percent. Negative is
// shorter. Zero where the owner set their own and it lands on the plan anyway, which is
// what stepping back up to it does.
export function intervalDeparture(action: TrackedAction): number {
  if (action.default_interval <= 0) return 0;
  return Math.round((intervalInForce(action) / action.default_interval - 1) * 100);
}
