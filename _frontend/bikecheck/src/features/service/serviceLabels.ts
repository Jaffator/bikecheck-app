// How the catalogue and the parts on a bike read on screen. Shared by the wizard that
// records a Service and the detail that reads one back — both name the same things.
import type { ActionTag, MountedComponent } from "./service.types";

// Catalogue entries carry a key; anything a user created carries only its own name.
export function catalogueLabel(
  i18nKey: string | null,
  fallback: string,
  translate: (key: string) => string,
): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// A part reads as its description, falling back to its type when it has none.
export function componentLabel(component: MountedComponent, translate: (key: string) => string): string {
  const type = catalogueLabel(component.component_type_i18n_key, component.component_type, translate);
  const name = component.component_desc ?? type;
  return component.position ? `${name} (${component.position})` : name;
}

// What an Action covers, on one line. Describes the Action itself, so it is never
// recorded per occasion — see ADR 0004.
export function tagLine(tags: ActionTag[], translate: (key: string) => string): string {
  return tags.map((tag) => catalogueLabel(tag.i18n_key, tag.tag, translate)).join(" · ");
}
