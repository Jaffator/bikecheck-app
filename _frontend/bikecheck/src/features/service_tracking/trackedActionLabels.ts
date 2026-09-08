// How a Tracked Action reads on screen. The part and the action are catalogue entries, so
// they are named the same way the service wizard names them; the axis reading is what makes
// the percentage checkable rather than magic.
import { catalogueLabel } from "@/features/service/serviceLabels";
import { positionLabel } from "@/features/components/componentLabels";
import type { HealthReading } from "@/features/bikes_page/bikeHealth.types";
import type { TrackedAction } from "./serviceTracking.types";

// How many minutes make the hour the app states ride time in.
const MINUTES_PER_HOUR = 60;

type Translate = (key: string, options?: Record<string, unknown>) => string;

// What kind of part this is — Fork, Chain — in the owner's language.
export function trackedPartName(action: TrackedAction, translate: Translate): string {
  return catalogueLabel(action.component_type_i18n_key, action.component_type, translate);
}

// The job being measured — Chain Replacement, Fork Full Service.
export function trackedActionName(action: TrackedAction, translate: Translate): string {
  return catalogueLabel(action.action_i18n_key, action.action_name, translate);
}

// The percentage as it is written, floored rather than rounded: the band and the number the
// owner reads then change at the same moment.
export function percentageLabel(action: TrackedAction, translate: Translate): string {
  return translate("serviceTracking.percentage", { value: Math.floor(action.percentage) });
}

// Where the part stands on its axis — "3 200 / 4 000 km". Ride time is stated in hours,
// which is what every other reading in the app is stated in.
export function axisReadingLabel(action: TrackedAction, language: string, translate: Translate): string {
  const inHours = action.axis === "min";
  const scale = (value: number): number => (inHours ? Math.round(value / MINUTES_PER_HOUR) : value);
  const format = (value: number): string => new Intl.NumberFormat(language).format(scale(value));

  const reading = `${format(action.current_value)} / ${format(action.interval_value)}`;
  if (action.axis === "km") return `${reading} ${translate("serviceTracking.unitKm")}`;
  if (inHours) return `${reading} ${translate("serviceTracking.unitHours")}`;
  // A wear index is a bare number: it counts nothing the owner would name.
  return reading;
}

// A Tracked Action as the badge and the meters read it.
export function toHealthReading(action: TrackedAction, language: string, translate: Translate): HealthReading {
  const position = positionLabel(action.position, translate);
  const label = position === null
    ? trackedActionName(action, translate)
    : `${trackedActionName(action, translate)} (${position})`;

  return {
    label,
    value: axisReadingLabel(action, language, translate),
    // The bar runs out at due; the percentage carries on past it.
    fill: Math.max(0, 1 - action.percentage / 100),
    level: action.attention_level,
  };
}
