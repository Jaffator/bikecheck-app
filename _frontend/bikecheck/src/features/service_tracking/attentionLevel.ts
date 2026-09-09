// How a reading looks on screen, and how a Tracked Action is turned into the one line that
// describes it. What a reading *means* is still the server's: it decides what the dashboard
// lists (80), what announces (95 and 100) and what may be put off (100). The colour is the
// frontend's own, and it warns earlier than any of those act — see ADR 0026.
import type { AttentionLevel, TrackedAction } from "./tracking.types";

// The colour a reading is read by before it is read as a number. Five steps, warming as the
// part runs out: quiet, first tint, clearly hot, reddening, and out of interval. Highest
// stop first, so the first one a reading clears is the one it wears. Every hue stands up on
// the app's dark surfaces.
const ATTENTION_RAMP: { from: number; color: string }[] = [
  { from: 100, color: "#EF4444" },
  { from: 90, color: "#F87171" },
  { from: 70, color: "#F97316" },
  { from: 60, color: "#EAB308" },
];

// The quiet end of the ramp, worn below the first stop — and by the dot that stands for a
// part with nothing to answer for.
export const QUIET_COLOR = "#4ADE80";

// Below this a reading carries no warning at all. Anything reading it has to read it here,
// so a row can never be tinted and dimmed at the same time.
export const QUIET_BELOW = 60;

export function attentionColor(percentage: number): string {
  return ATTENTION_RAMP.find((step) => percentage >= step.from)?.color ?? QUIET_COLOR;
}

// The bike's condition as a whole: the worst level among its Tracked Actions. The level is
// the server's own function of the percentage, so the highest percentage always carries the
// worst level — the two questions have one answer. A bike with nothing tracked is good,
// because nothing is telling us otherwise.
export function overallLevel(actions: TrackedAction[]): AttentionLevel {
  return worstAction(actions)?.level ?? "good";
}

// The one Tracked Action a card leads with: the highest percentage there is. The rest
// belong on the bike's own page, not in the garage.
export function worstAction(actions: TrackedAction[]): TrackedAction | null {
  if (actions.length === 0) return null;

  return actions.reduce((worst, action) => (action.percentage > worst.percentage ? action : worst));
}

// How full the bar behind a reading runs. An overdue action fills it and no more — the
// number beside it is what says how far past due it is.
export function barFill(action: TrackedAction): number {
  return Math.min(action.percentage / 100, 1);
}

// The figures behind the percentage — "3 200 / 4 000 km" — so the reading is checkable.
// Minutes are read as hours, which is the unit the rest of the app gives ride time in.
//
// A wear index has no unit and no scale an owner can hold: "0 / 50 000" says nothing about
// brake pads. It is named instead, and what it means is behind the info button beside it.
export function axisReading(
  action: TrackedAction,
  language: string,
  translate: (key: string) => string,
): string {
  const format = (value: number): string => new Intl.NumberFormat(language).format(value);

  if (action.axis === "min") {
    return `${format(Math.round(action.current / 60))} / ${format(Math.round(action.interval / 60))} h`;
  }
  if (action.axis === "km") {
    return `${format(action.current)} / ${format(action.interval)} km`;
  }
  return translate("tracking.axisWearIndex");
}

// What identifies a reading in a list: the part it is on and the job it is about. Neither
// alone is unique — one part owes several jobs, and one job is owed by several parts.
export function trackedActionKey(action: TrackedAction): string {
  return `${String(action.component_mounted_id)}-${String(action.event_action_id)}`;
}
