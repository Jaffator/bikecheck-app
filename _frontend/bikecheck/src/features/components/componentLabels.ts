// How the parts on a bike read on screen. The service wizard names the same catalogue, so
// the label rule is taken from there rather than written a second time.
import { catalogueLabel } from "@/features/service/serviceLabels";
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
