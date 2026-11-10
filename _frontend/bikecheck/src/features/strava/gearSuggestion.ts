import type { GearLinkingBike, StravaBike } from "./strava.types";

const MIN_TOKEN = 3;

// The one free Strava gear whose name carries the bike's brand or model, or null when none or
// several do - a guess is only worth preselecting when it is the only one.
export function suggestGear(
  bike: GearLinkingBike,
  gear: StravaBike[],
  takenIds: ReadonlySet<string>,
): StravaBike | null {
  const tokens = [bike.bike_brand, bike.bike_model ?? ""]
    .flatMap((part) => part.toLowerCase().split(/\s+/))
    .filter((token) => token.length >= MIN_TOKEN);

  const matches = gear.filter(
    (candidate) => !takenIds.has(candidate.id) && tokens.some((token) => candidate.name.toLowerCase().includes(token)),
  );
  return matches.length === 1 ? matches[0] : null;
}
