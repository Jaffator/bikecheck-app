// Define step-three component state outside the view.
import type { AssembleBikeComponent, ComponentGroup } from "../components/components.types";
import type { SuspensionLayout } from "./bikeSpecification.types";

// Track component types excluded from the bike.
export type DisabledComponents = ReadonlySet<number>;

// Hide components incompatible with the selected suspension.
const HIDDEN_BY_SUSPENSION: Record<SuspensionLayout, string[]> = {
  full: [],
  hardtail: ["component.shock"],
  none: ["component.shock"],
};

// The suspension layout is only known from step 2; until then nothing is hidden.
export function visibleComponents(
  components: AssembleBikeComponent[],
  suspension: SuspensionLayout | null,
): AssembleBikeComponent[] {
  if (suspension === null) return components;
  const hidden = HIDDEN_BY_SUSPENSION[suspension];
  return components.filter((component) => !hidden.includes(component.component_i18n_key ?? ""));
}

// Describe component position or absence of a side.
export const SIDED_POSITIONS = ["front", "rear"] as const;
export type ComponentPosition = (typeof SIDED_POSITIONS)[number] | "none";

// Store one component description field.
export interface ComponentEntry {
  description: string;
}

// Key entries by component type and position.
export type ComponentEntries = Record<string, ComponentEntry>;

export function entryKey(componentTypeId: number, position: ComponentPosition): string {
  return `${componentTypeId}:${position}`;
}

// Track types split into separate front and rear fields.
export type SplitComponents = ReadonlySet<number>;

// Return fields for split or unsided components.
export function positionsOf(component: AssembleBikeComponent, split: SplitComponents): ComponentPosition[] {
  return isSplit(component, split) ? [...SIDED_POSITIONS] : ["none"];
}

export function isSplit(component: AssembleBikeComponent, split: SplitComponents): boolean {
  return component.has_position && split.has(componentTypeId(component));
}

// One category with the component types that belong to it.
export interface GroupedComponents {
  group: ComponentGroup;
  components: AssembleBikeComponent[];
}

export function componentTypeId(component: AssembleBikeComponent): number {
  return component.component.component_type_id;
}

// Preserve seeded group order and omit empty groups.
export function groupComponents(groups: ComponentGroup[], components: AssembleBikeComponent[]): GroupedComponents[] {
  return groups
    .map((group) => ({
      group,
      components: components.filter((component) => component.component_group_id === group.id),
    }))
    .filter((entry) => entry.components.length > 0);
}

// Prefill entries from scraped descriptions, preserving reported sides.
export function buildInitialEntries(scraped: AssembleBikeComponent[]): ComponentEntries {
  const entries: ComponentEntries = {};
  const split = scrapedSplitComponents(scraped);

  for (const component of scraped) {
    const scrapedPosition = component.component.position;
    const position: ComponentPosition =
      split.has(componentTypeId(component)) && (scrapedPosition === "front" || scrapedPosition === "rear")
        ? scrapedPosition
        : "none";
    entries[entryKey(componentTypeId(component), position)] = {
      description: component.component.component_desc ?? "",
    };
  }

  return entries;
}

// Split types whose scraped sides have different descriptions.
export function scrapedSplitComponents(scraped: AssembleBikeComponent[]): SplitComponents {
  const byType = new Map<number, AssembleBikeComponent[]>();

  for (const component of scraped) {
    if (!component.has_position) continue;
    const existing = byType.get(componentTypeId(component));
    if (existing) existing.push(component);
    else byType.set(componentTypeId(component), [component]);
  }

  const split = new Set<number>();

  for (const [typeId, components] of byType) {
    const descriptions = new Set(components.map((component) => component.component.component_desc ?? ""));
    if (descriptions.size > 1) split.add(typeId);
  }

  return split;
}

export function readEntry(entries: ComponentEntries, componentTypeId: number, position: ComponentPosition): ComponentEntry {
  return entries[entryKey(componentTypeId, position)] ?? { description: "" };
}

// Preserve existing descriptions while toggling split fields.
export function entriesAfterSplitToggle(
  entries: ComponentEntries,
  componentTypeId: number,
  nowSplit: boolean,
): ComponentEntries {
  if (nowSplit) {
    const merged = readEntry(entries, componentTypeId, "none").description;
    return {
      ...entries,
      [entryKey(componentTypeId, "front")]: { description: merged },
      [entryKey(componentTypeId, "rear")]: { description: merged },
    };
  }

  return {
    ...entries,
    [entryKey(componentTypeId, "none")]: readEntry(entries, componentTypeId, "front"),
  };
}

// Count filled component fields for the group status.
export function countConfigured(
  entries: ComponentEntries,
  components: AssembleBikeComponent[],
  split: SplitComponents,
  disabled: DisabledComponents,
): number {
  return components.reduce((total, component) => {
    if (disabled.has(componentTypeId(component))) return total;
    const filled = positionsOf(component, split).filter(
      (position) => readEntry(entries, componentTypeId(component), position).description.trim() !== "",
    ).length;
    return total + filled;
  }, 0);
}

// Count active component fields for the group status denominator.
export function countFields(
  components: AssembleBikeComponent[],
  split: SplitComponents,
  disabled: DisabledComponents,
): number {
  return components.reduce(
    (total, component) => (disabled.has(componentTypeId(component)) ? total : total + positionsOf(component, split).length),
    0,
  );
}

// Build mounted records from enabled, described, or essential components.
export function toMountedComponents(
  entries: ComponentEntries,
  components: AssembleBikeComponent[],
  split: SplitComponents,
  disabled: DisabledComponents,
): AssembleBikeComponent[] {
  return components
    .filter((component) => !disabled.has(componentTypeId(component)))
    .flatMap((component) =>
      positionsOf(component, split)
        .map((position) => ({
          position,
          description: readEntry(entries, componentTypeId(component), position).description.trim(),
        }))
        .filter(({ description }) => description !== "" || component.essential)
        .flatMap(({ position, description }) => {
          // Expand merged sided components into front and rear records.
          const positions: ComponentPosition[] =
            position === "none" && component.has_position ? [...SIDED_POSITIONS] : [position];

          return positions.map((mountedPosition) => ({
            ...component,
            component: {
              ...component.component,
              // Keep unnamed essential components distinguishable from empty descriptions.
              component_desc: description === "" ? null : description,
              // Omit the position for unsided components.
              position: mountedPosition === "none" ? undefined : mountedPosition,
            },
          }));
        }),
    );
}
