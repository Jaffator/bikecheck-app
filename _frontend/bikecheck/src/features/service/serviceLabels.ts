// How the catalogue and the parts on a bike read on screen. Shared by the wizard that
// records a Service and the detail that reads one back — both name the same things.
import type { MountedComponent } from "./service.types";

// As much of a part's name as a chip can carry without crowding out its neighbours.
const CHIP_LABEL_LIMIT = 30;

// Catalogue entries carry a key; anything a user created carries only its own name.
export function catalogueLabel(
  i18nKey: string | null,
  fallback: string,
  translate: (key: string) => string,
): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// A part reads as its description, falling back to its type when it has none.
function partName(component: MountedComponent, translate: (key: string) => string): string {
  const type = catalogueLabel(component.component_type_i18n_key, component.component_type, translate);
  return component.component_desc ?? type;
}

// The part's full name, with the position that tells two otherwise identical parts apart.
export function componentLabel(component: MountedComponent, translate: (key: string) => string): string {
  const suffix = component.position ? ` (${component.position})` : "";
  return `${partName(component, translate)}${suffix}`;
}

// The same label, cut to fit a chip. Only the name gives way: the position is what makes
// the front brake readable as not the rear one, so it survives whatever the name loses.
export function shortComponentLabel(component: MountedComponent, translate: (key: string) => string): string {
  const suffix = component.position ? ` (${component.position})` : "";
  const name = partName(component, translate);
  const room = CHIP_LABEL_LIMIT - suffix.length;
  if (name.length <= room) return `${name}${suffix}`;
  return `${name.slice(0, Math.max(room - 1, 0)).trimEnd()}…${suffix}`;
}
