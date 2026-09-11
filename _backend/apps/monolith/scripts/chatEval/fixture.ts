// The garage the eval asks about. Every number the questions expect is derived from here, so a
// change to the data cannot leave an expectation behind. Dates are offsets from the day the seed
// runs, which keeps "the last 12 months" meaning the same thing forever.

export const EVAL_EMAIL = 'eval@bikecheck.local';
export const EVAL_NAME = 'Chat Eval';
export const EVAL_LANGUAGE = 'cs';
export const EVAL_CURRENCY = 'CZK';
// A connected account with one paired bike: the state the chat has to tell apart from both
// "no Strava at all" and "everything paired".
export const EVAL_STRAVA_ATHLETE_ID = 'eval-athlete-1';

export type BikeKey = 'B1' | 'B2' | 'B3';

export interface FixturePart {
  key: string;
  // Must exist in the seeded catalogue - see scripts/seedData/seed_type_components.ts.
  type: string;
  desc: string;
  position?: string;
  // Null is a part nobody wrote a mounting date for, which the chat may not invent one for.
  mountedDaysAgo: number | null;
  // Null is a figure nobody ever recorded, which is not the same as a part that has done zero.
  totalKm: number | null;
  totalTimeMin: number | null;
  drivetrainKm?: number;
  suspensionMin?: number;
}

export interface FixtureBike {
  key: BikeKey;
  brand: string;
  model: string;
  year: number;
  // Null is a figure nobody ever recorded - the shape a bike nobody has ridden really has.
  totalKm: number | null;
  totalTimeMin: number | null;
  elevationM: number | null;
  size: string | null;
  weightKg: number | null;
  // Null is a bike Strava rides do not land on.
  stravaGearId: string | null;
  parts: FixturePart[];
}

export const BIKES: FixtureBike[] = [
  {
    key: 'B1',
    brand: 'Cube',
    model: 'Nuroad',
    year: 2025,
    totalKm: 4210,
    totalTimeMin: 12_600,
    elevationM: 31_500,
    size: '56',
    weightKg: 9.4,
    stravaGearId: 'b9876543',
    parts: [
      // 4960 driven, 1000 of them before the last replacement: 3960 of a 3000 km interval
      // is the 132% reading the questions expect.
      { key: 'B1_CHAIN', type: 'Chain', desc: 'Shimano XT M8100', mountedDaysAgo: 100, totalKm: 1800, totalTimeMin: 5400, drivetrainKm: 4960 },
      { key: 'B1_CASSETTE', type: 'Cassette', desc: 'Shimano XT 11-34', mountedDaysAgo: 400, totalKm: 4210, totalTimeMin: 12_600, drivetrainKm: 4210 },
      { key: 'B1_PAD', type: 'Brake pad', desc: 'SwissStop Disc 34', position: 'front', mountedDaysAgo: 300, totalKm: 2100, totalTimeMin: 6300 },
      { key: 'B1_TIRE_F', type: 'Tire', desc: 'Schwalbe G-One 40', position: 'front', mountedDaysAgo: 220, totalKm: 3100, totalTimeMin: 9300 },
      { key: 'B1_TIRE_R', type: 'Tire', desc: 'Schwalbe G-One 40', position: 'rear', mountedDaysAgo: 220, totalKm: 3100, totalTimeMin: 9300 },
    ],
  },
  {
    key: 'B2',
    brand: 'Canyon',
    model: 'Spectral',
    year: 2021,
    totalKm: 980,
    totalTimeMin: 4200,
    elevationM: 22_000,
    size: 'M',
    weightKg: 14.2,
    stravaGearId: null,
    parts: [
      // 1800 of a 4000 min interval is 45%: in order, and the counterweight to the chain.
      { key: 'B2_FORK', type: 'Fork', desc: 'Fox 36 Factory', mountedDaysAgo: 500, totalKm: 980, totalTimeMin: 4200, suspensionMin: 1800 },
      { key: 'B2_SHOCK', type: 'Shock', desc: 'Fox Float X', mountedDaysAgo: 500, totalKm: 980, totalTimeMin: 4200, suspensionMin: 1800 },
      { key: 'B2_TIRE_F', type: 'Tire', desc: 'Maxxis Minion DHF', position: 'front', mountedDaysAgo: 500, totalKm: 980, totalTimeMin: 4200 },
    ],
  },
  {
    key: 'B3',
    brand: 'Author',
    model: 'Basic',
    year: 2013,
    totalKm: null,
    totalTimeMin: null,
    elevationM: null,
    size: null,
    weightKg: null,
    stravaGearId: null,
    // A part nobody dated, on a bike nobody has ridden: two figures the chat may not state.
    parts: [
      { key: 'B3_CHAIN', type: 'Chain', desc: 'KMC X8', mountedDaysAgo: null, totalKm: null, totalTimeMin: null, drivetrainKm: 0 },
    ],
  },
];

export interface FixtureService {
  bike: BikeKey;
  daysAgo: number;
  // Must exist in the seeded catalogue - see scripts/seedData/seed_data.json.
  action: string;
  partKey: string;
  note: string;
  cost: number;
  // Whether the part came off on this occasion. list_services filters on it, so a replacement
  // that is not marked as one is a replacement the chat cannot find.
  replaced?: boolean;
  // What the part's accumulators read when the work was done. The wear of a tracked job is
  // measured from here, so the chain's reading is decided by this line and not by its total.
  baselineDrivetrainKm?: number;
}

// Newest first, which is the order the chat reads them in.
export const SERVICES: FixtureService[] = [
  { bike: 'B1', daysAgo: 14, action: 'Chain Lube', partKey: 'B1_CHAIN', note: 'mazani po desti', cost: 150 },
  {
    bike: 'B1',
    daysAgo: 100,
    action: 'Chain Replacement',
    partKey: 'B1_CHAIN',
    note: 'novy KMC X11',
    cost: 850,
    replaced: true,
    baselineDrivetrainKm: 1000,
  },
  { bike: 'B1', daysAgo: 300, action: 'Pads Replacement', partKey: 'B1_PAD', note: 'predni desticky', cost: 620, replaced: true },
  { bike: 'B1', daysAgo: 500, action: 'Tire Replacement', partKey: 'B1_TIRE_F', note: 'vymena plaste', cost: 1200, replaced: true },
];

// The service that answers "when did I last replace the chain".
export const CHAIN_REPLACEMENT = SERVICES[1];

export interface FixtureRide {
  bike: BikeKey;
  daysAgo: number;
  km: number;
  minutes: number;
  elevationM: number;
}

export const RIDES: FixtureRide[] = [
  { bike: 'B1', daysAgo: 3, km: 62, minutes: 150, elevationM: 620 },
  { bike: 'B1', daysAgo: 10, km: 41, minutes: 95, elevationM: 380 },
  { bike: 'B1', daysAgo: 40, km: 120, minutes: 300, elevationM: 1400 },
  { bike: 'B2', daysAgo: 200, km: 18, minutes: 70, elevationM: 540 },
];

export interface FixtureInterval {
  bike: BikeKey;
  action: string;
  km?: number;
  min?: number;
}

// Only two, so the garage has exactly two readings and the worst of them is never in doubt.
export const INTERVALS: FixtureInterval[] = [
  { bike: 'B1', action: 'Chain Replacement', km: 3000 },
  { bike: 'B2', action: 'Fork Basic Service', min: 4000 },
];

// The setup the chat reads back. A fork on B2 and nothing on B1, so "what pressure do I run"
// has both a true answer and one that must not be invented.
export const FORK_SETUP = { partKey: 'B2_FORK', pressurePsi: 75, sagPercentage: 25, reboundLs: 8 };
export const TIRE_SETUP = { partKey: 'B2_TIRE_F', pressurePsi: 23 };

export const REPORT = { bike: 'B1' as BikeKey, kind: 'PERIOD' as const, isPublic: true };

// What the questions expect, computed here so the fixture and the expectation cannot drift.
export const SERVICE_TOTAL_12M = SERVICES.filter((row) => row.daysAgo <= 365).reduce((sum, row) => sum + row.cost, 0);
export const SERVICE_TOTAL_ALL = SERVICES.reduce((sum, row) => sum + row.cost, 0);
export const LAST_SERVICE_COST = SERVICES[0].cost;
export const PREVIOUS_SERVICE_COST = SERVICES[1].cost;
export const RIDES_LAST_MONTH_KM = RIDES.filter((row) => row.bike === 'B1' && row.daysAgo <= 30).reduce((sum, row) => sum + row.km, 0);
export const B1_PART_COUNT = BIKES[0].parts.length;
// The hours the chat writes for B1, which is the shape # WRITING THE ANSWER asks for.
export const B1_HOURS = (BIKES[0].totalTimeMin ?? 0) / 60;
// 3960 / 3000 and 1800 / 4000, as ServiceTrackingService reads them. The seed asserts both.
export const CHAIN_PERCENTAGE = 132;
// The same readings said the other way, which is how the chat tends to put them: how far past
// the interval the chain is, and how much of the fork's interval is left.
export const CHAIN_OVER_INTERVAL_KM = 960;
export const FORK_REMAINING_MIN = 2200;
export const FORK_PERCENTAGE = 45;

export function bike(key: BikeKey): FixtureBike {
  const found = BIKES.find((row) => row.key === key);
  if (found === undefined) throw new Error(`No fixture bike ${key}`);

  return found;
}

// The day an offset lands on, at noon, so a timezone can never move it across a date boundary.
export function dayAgo(days: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);

  return date;
}
