// The shape step 3 collects, kept out of the component so the wizard can read
// and submit it without importing the view.
import type { AssembleBikeComponent, ComponentGroup } from "../components/components.types";

// Which side of the bike a part sits on. A part that has sides is asked for
// both of them; "none" is what everything else carries.
export const SIDED_POSITIONS = ["front", "rear"] as const;
export type ComponentPosition = (typeof SIDED_POSITIONS)[number] | "none";

// What the user typed for one input. A sided part owns two of these — one per
// side — so the position is part of the key, not of the value.
export interface ComponentEntry {
  description: string;
}

// Keyed by "<component_type_id>:<position>", so a row keeps its answer while
// groups collapse and expand, and front never overwrites rear.
export type ComponentEntries = Record<string, ComponentEntry>;

export function entryKey(componentTypeId: number, position: ComponentPosition): string {
  return `${componentTypeId}:${position}`;
}

// Component types the user split into a front and a rear field, by
// component_type_id. A sided part starts merged — the same rim usually sits at
// both ends — and only splits when the two sides differ.
export type SplitComponents = ReadonlySet<number>;

// The fields a component type shows: both ends once it is split, otherwise the
// single field. An unsided part can never be split.
export function positionsOf(
  component: AssembleBikeComponent,
  split: SplitComponents,
): ComponentPosition[] {
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

// The scraper returns one entry per part it recognised; the defaults list holds
// every type the user could track. Both carry component_type_id, which is what
// ties a scraped description to the row it prefills.
export function componentTypeId(component: AssembleBikeComponent): number {
  return component.component.component_type_id;
}

// Groups keep their seeded order (Suspension, Frame, Cockpit, …), which is the
// order the design lists them in. Empty groups are dropped — an e-bike group
// with nothing in it is not worth a row on a phone.
export function groupComponents(
  groups: ComponentGroup[],
  components: AssembleBikeComponent[],
): GroupedComponents[] {
  return groups
    .map((group) => ({
      group,
      components: components.filter((component) => component.component_group_id === group.id),
    }))
    .filter((entry) => entry.components.length > 0);
}

// The scraped list prefills the form: a part the provider recognised arrives
// with its description, and the user only corrects it. Types the scraper did
// not mention start empty.
//
// The scrape describes one side at a time, so a type it reported for both ends
// fills the front and rear fields; anything else fills the merged one.
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

// A type the scrape described twice — a front and a rear that are not the same
// part — opens already split, because merging them would drop one of them.
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

export function readEntry(
  entries: ComponentEntries,
  componentTypeId: number,
  position: ComponentPosition,
): ComponentEntry {
  return entries[entryKey(componentTypeId, position)] ?? { description: "" };
}

// Toggling the split moves what the user already typed into the fields that
// take over, so the answer is never lost by flipping the switch: splitting
// seeds both sides from the merged field, merging keeps the front one.
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

// A group counts as configured by how many of its inputs the user actually
// described — the badge in the design ("3 Parts Configured") reports this. A
// split part filled on both ends counts twice, because it is two parts.
export function countConfigured(
  entries: ComponentEntries,
  components: AssembleBikeComponent[],
  split: SplitComponents,
): number {
  return components.reduce((total, component) => {
    const filled = positionsOf(component, split).filter(
      (position) => readEntry(entries, componentTypeId(component), position).description.trim() !== "",
    ).length;
    return total + filled;
  }, 0);
}

// How many parts a group could hold at all — the denominator of "2 / 7". A
// split part counts as two, because it is asking for two answers.
export function countFields(components: AssembleBikeComponent[], split: SplitComponents): number {
  return components.reduce((total, component) => total + positionsOf(component, split).length, 0);
}

// Only described parts are worth creating: an untouched input would become a
// mounted component the user never owned.
//
// A split part yields one record per side the user described. A merged sided
// part describes both ends at once, so it yields a front and a rear carrying
// the same description — the bike really does have two of them.
export function toMountedComponents(
  entries: ComponentEntries,
  components: AssembleBikeComponent[],
  split: SplitComponents,
): AssembleBikeComponent[] {
  return components.flatMap((component) =>
    positionsOf(component, split)
      .map((position) => ({
        position,
        description: readEntry(entries, componentTypeId(component), position).description.trim(),
      }))
      .filter(({ description }) => description !== "")
      .flatMap(({ position, description }) => {
        // The merged field of a sided part stands for both ends; everything
        // else is the one record it looks like.
        const positions: ComponentPosition[] =
          position === "none" && component.has_position ? [...SIDED_POSITIONS] : [position];

        return positions.map((mountedPosition) => ({
          ...component,
          component: {
            ...component.component,
            component_desc: description,
            // "none" is the absence of a side, which the backend stores as no
            // position at all.
            position: mountedPosition === "none" ? undefined : mountedPosition,
          },
        }));
      }),
  );
}
