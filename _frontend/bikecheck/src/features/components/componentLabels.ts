// How the parts on a bike read on screen. The service wizard names the same catalogue, so
// the label rule is taken from there rather than written a second time.
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { WearMeasure } from "@/features/service_tracking/tracking.types";
import type { BikeComponent } from "./components.types";

// What kind of part this is — Fork, Chain — in the owner's language.
export function componentTypeName(component: BikeComponent, translate: (key: string) => string): string {
  return catalogueLabel(component.component_type_i18n_key, component.component_type, translate);
}

// The category the part sits in, read the same way the service wizard groups its actions.
export function componentCategoryName(component: BikeComponent, translate: (key: string) => string): string {
  return catalogueLabel(component.component_group_i18n_key, component.component_group, translate);
}

// The side of the bike a part sits on. Anything the app did not write itself is shown as
// stored rather than dropped.
export function positionLabel(position: string | null, translate: (key: string) => string): string | null {
  if (position === null || position.trim() === "") return null;
  if (position === "front") return translate("addBike.positionFront");
  if (position === "rear") return translate("addBike.positionRear");
  return position;
}

// A part that has come off the bike. Dismounting writes both, so either one answers.
export function isDismounted(component: BikeComponent): boolean {
  return component.is_active === false || component.removed_at !== null;
}

// The seeded part types the ride analysis actually accumulates these two readings
// against — the same lists the sync writes with, so a part only shows a reading that is
// being fed. A user-created type is not on either list and reads neither.
const DRIVETRAIN_TYPES = ["Chain", "Chainring", "Cassette"];
const SUSPENSION_TYPES = ["Fork", "Shock"];

// Does the ride sync add drivetrain kilometres to this part?
export function tracksDrivetrain(component: BikeComponent): boolean {
  return DRIVETRAIN_TYPES.includes(component.component_type);
}

// Does the ride sync add suspension minutes to this part?
export function tracksSuspension(component: BikeComponent): boolean {
  return SUSPENSION_TYPES.includes(component.component_type);
}

// The three readings the ride analysis makes of the terrain, and where each says what it
// is. The odometer's own kilometres and minutes explain themselves and carry nothing.
const EXPLAINED_MEASURES: Partial<Record<WearMeasure, { label: string; info: string }>> = {
  drivetrain_km: { label: "bikeComponents.detailDrivetrain", info: "bikeComponents.detailDrivetrainInfo" },
  suspension_min: { label: "bikeComponents.detailSuspension", info: "bikeComponents.detailSuspensionInfo" },
  health_index: { label: "bikeComponents.detailHealthIndex", info: "bikeComponents.detailHealthIndexInfo" },
};

// What a reading is and where its number comes from, for the owner - or null where the
// reading needs no explaining. One wording, wherever it is asked for.
export interface WearExplanation {
  title: string;
  body: string;
  // What the button offering it announces itself as.
  aria: string;
}

export function wearExplanation(
  measure: WearMeasure,
  translate: (key: string, params?: Record<string, string>) => string,
): WearExplanation | null {
  const keys = EXPLAINED_MEASURES[measure];
  if (keys === undefined) return null;

  const title = translate(keys.label);

  return { title, body: translate(keys.info), aria: translate("bikeComponents.detailInfo", { reading: title }) };
}

// One Component Category, holding what is on the bike now and what has come off it.
export interface ComponentCategory {
  id: number;
  name: string;
  // The seeded English name, which is what the category icons are keyed on.
  groupName: string;
  mounted: BikeComponent[];
  dismounted: BikeComponent[];
}

// The build, read as its categories. A category the bike has nothing in is not a category
// of this bike, so it is left out; the order the read arrives in is kept.
export function groupByCategory(
  components: BikeComponent[],
  translate: (key: string) => string,
): ComponentCategory[] {
  const categories = new Map<number, ComponentCategory>();

  for (const component of components) {
    const existing = categories.get(component.component_group_id) ?? {
      id: component.component_group_id,
      name: componentCategoryName(component, translate),
      groupName: component.component_group,
      mounted: [],
      dismounted: [],
    };

    if (isDismounted(component)) existing.dismounted.push(component);
    else existing.mounted.push(component);

    categories.set(component.component_group_id, existing);
  }

  return [...categories.values()];
}
