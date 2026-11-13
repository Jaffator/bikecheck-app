import { suggestGear } from "./gearSuggestion";
import type { GearLinkingBike, StravaBike } from "./strava.types";

// Gear id per bike; null is "don't pair yet", a missing key a bike not decided yet.
export type GearChoices = Partial<Record<number, string | null>>;

// Name matches preselected per bike; a gear suggested to one bike is not offered to the next.
export function suggestChoices(
  rows: GearLinkingBike[],
  gear: StravaBike[],
  pairedIds: ReadonlySet<string>,
): GearChoices {
  const taken = new Set(pairedIds);
  const choices: GearChoices = {};
  for (const bike of rows) {
    const suggested = suggestGear(bike, gear, taken);
    if (suggested === null) continue;
    choices[bike.id] = suggested.id;
    taken.add(suggested.id);
  }
  return choices;
}

// The next undecided bike after `afterId`, wrapping round; a declined bike is not reopened.
export function nextOpenBike(
  rows: GearLinkingBike[],
  choices: GearChoices,
  afterId: number | null,
): number | null {
  const start =
    afterId === null ? 0 : rows.findIndex((bike) => bike.id === afterId) + 1;
  const ordered = [...rows.slice(start), ...rows.slice(0, start)];
  const next = ordered.find(
    (bike) => bike.id !== afterId && choices[bike.id] === undefined,
  );
  return next?.id ?? null;
}
