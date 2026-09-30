// How a line of what a ride wore off reads: the Tracked Action, the wear the ride added and its colour.
import { positionLabel } from "@/features/components/componentLabels";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, DUE_FROM, trackedPartLabel } from "@/features/service_tracking/attentionLevel";
import { formatDuration } from "./rideDuration";
import type { WoreOffLine } from "./rides.types";

// A Replacement is named by the part it replaces, any other Tracked Action by its Action; both keep the side.
export function woreOffLabel(line: WoreOffLine, translate: (key: string) => string): string {
  if (line.replace_action) return trackedPartLabel(line, translate);
  const action = catalogueLabel(line.action_i18n_key, line.action_name, translate);
  const side = positionLabel(line.position, translate);
  return side === null ? action : `${action} (${side})`;
}

// In the reading's own unit; the wear index has none, so the percent change says it alone.
export function woreOffAmount(
  line: WoreOffLine,
  translate: (key: string, options: { count: number }) => string,
): string | null {
  if (line.measure === "total_km" || line.measure === "drivetrain_km") {
    return `+${translate("pendingRides.distance", { count: line.amount })}`;
  }
  if (line.measure === "total_time_min" || line.measure === "suspension_min") {
    return `+${formatDuration(line.amount)}`;
  }
  return null;
}

// The app speaks from warning up, so below it the figure stays plain.
export function woreOffColor(line: WoreOffLine): string | undefined {
  return line.after >= DUE_FROM ? attentionColor(line.after) : undefined;
}
