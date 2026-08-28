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
