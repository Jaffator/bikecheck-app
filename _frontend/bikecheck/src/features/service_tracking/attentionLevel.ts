// How an Attention Level reads on screen, and how a Tracked Action is turned into the one
// line that describes it. The bands themselves are the server's — the frontend never
// decides what is overdue, it only colours what it is told.
import type { AttentionLevel, TrackedAction } from "./tracking.types";

// One ramp, four steps: nothing to do, worth planning, order the part, riding on borrowed
// time. Read by colour before it is read by number, so each step has to be its own hue —
// and every one of them stands up on the app's dark surfaces.
export const ATTENTION_COLORS: Record<AttentionLevel, string> = {
  good: "#4ADE80",
  warning: "#EAB308",
  critical: "#F97316",
  overdue: "#EF4444",
};

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
// Minutes are read as hours, which is the unit the rest of the app gives ride time in; a
// wear index is a bare count and carries no unit at all.
export function axisReading(action: TrackedAction, language: string): string {
  const format = (value: number): string => new Intl.NumberFormat(language).format(value);

  if (action.axis === "min") {
    return `${format(Math.round(action.current / 60))} / ${format(Math.round(action.interval / 60))} h`;
  }
  if (action.axis === "km") {
    return `${format(action.current)} / ${format(action.interval)} km`;
  }
  return `${format(action.current)} / ${format(action.interval)}`;
}
