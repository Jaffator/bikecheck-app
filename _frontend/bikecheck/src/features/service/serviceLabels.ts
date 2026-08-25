// How the catalogue and the parts on a bike read on screen. Shared by the wizard that
// records a Service and the detail that reads one back — both name the same things.
import type { MountedComponent } from "./service.types";

// As much of a part's name as a chip can carry without crowding out its neighbours. A
// seeded type is a word or two, but a type a user created can be as long as they like.
const CHIP_LABEL_LIMIT = 30;

// Catalogue entries carry a key; anything a user created carries only its own name.
export function catalogueLabel(
  i18nKey: string | null,
  fallback: string,
  translate: (key: string) => string,
): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// What kind of part this is — Fork, Headset, Chain. Not what the user called it: while
// recording work they are looking for the kind, and the model name is what they read
// afterwards. Two parts of one kind therefore read alike, which is accepted: nothing
// disambiguates them beyond the position, and the case is rare enough not to earn logic.
function typeName(component: MountedComponent, translate: (key: string) => string): string {
  return catalogueLabel(component.component_type_i18n_key, component.component_type, translate);
}

// The kind and the position — everything the wizard's chips say about a part.
export function componentTypeLabel(component: MountedComponent, translate: (key: string) => string): string {
  const suffix = component.position ? ` (${component.position})` : "";
  return `${typeName(component, translate)}${suffix}`;
}

// The same label, cut to fit a chip. Only the kind gives way: the position is what makes
// the front brake readable as not the rear one, so it survives whatever the name loses.
export function shortComponentLabel(component: MountedComponent, translate: (key: string) => string): string {
  const suffix = component.position ? ` (${component.position})` : "";
  const name = typeName(component, translate);
  const room = CHIP_LABEL_LIMIT - suffix.length;
  if (name.length <= room) return `${name}${suffix}`;
  return `${name.slice(0, Math.max(room - 1, 0)).trimEnd()}…${suffix}`;
}

// The part in full, for reading a recorded Service back: which kind it was, and what the
// user called it. A part they never named reads as its kind alone rather than as an
// empty colon.
export function componentLabel(component: MountedComponent, translate: (key: string) => string): string {
  const described = component.component_desc?.trim();
  const kind = componentTypeLabel(component, translate);
  return described ? `${kind}: ${described}` : kind;
}
