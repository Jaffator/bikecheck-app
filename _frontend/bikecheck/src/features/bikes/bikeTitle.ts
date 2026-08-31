// One name for a bike across the whole app: what the bike is, not what its owner
// calls it. The nickname lives on `bikename` and only the garage shows it.
interface NamedBike {
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
}

// "Santa Cruz Hightower 2022" — everything but the brand is optional, so the
// parts are joined rather than templated.
export function bikeTitle(bike: NamedBike): string {
  return [bike.bike_brand, bike.bike_model, bike.year].filter(Boolean).join(" ");
}

// The same name, split the way the bike detail reads it: the brand as a kicker above, and
// everything else as the heading. A bike with no model is named by its brand alone, so the
// heading is never empty - the kicker is what gives way.
export interface SplitBikeTitle {
  kicker: string | null;
  heading: string;
}

export function splitBikeTitle(bike: NamedBike): SplitBikeTitle {
  const rest = [bike.bike_model, bike.year].filter(Boolean).join(" ");
  return rest === "" ? { kicker: null, heading: bike.bike_brand } : { kicker: bike.bike_brand, heading: rest };
}
