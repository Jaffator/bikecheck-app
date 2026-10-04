import { follow_status, profile_visibility, service_place, tire_pressure_unit } from '@prisma/client';

// Not a secret - the accounts only ever exist in a development database.
export const MOCK_RIDER_PASSWORD = 'mock-rider';

// One Mounted Component. `key` is how the services point at it; `km` is what it has ridden.
export interface PartPlan {
  key: string;
  component_type: string;
  component_desc: string;
  position: string | null;
  km: number;
}

export interface ActionPlan {
  action_name: string;
  part_keys: string[];
  cost: number | null;
  replacement: boolean;
}

// `km_ago` is what the bike has ridden since, so a part replaced here carries exactly that.
export interface ServicePlan {
  days_ago: number;
  km_ago: number;
  place: service_place;
  shop_name: string | null;
  note: string;
  actions: ActionPlan[];
}

export interface LegPlan {
  pressure_psi: number;
  sag_percent: number;
  tokens: number;
  rebound: number;
  compression: number;
}

export interface SetupPlan {
  name: string;
  front_tire_psi: number;
  rear_tire_psi: number;
  fork: LegPlan | null;
  shock: LegPlan | null;
}

export interface BikePlan {
  bike_brand: string;
  bike_model: string;
  bikename: string | null;
  bike_type: string;
  year: number;
  wheel_size: string;
  bike_size: string;
  frame_material: string;
  ebike: boolean;
  total_km: number;
  owned_days: number;
  is_shared: boolean;
  parts: PartPlan[];
  services: ServicePlan[];
  setups: SetupPlan[];
}

export interface RiderPlan {
  email: string;
  name: string;
  handle: string;
  visibility: profile_visibility;
  share_components: boolean;
  share_setup: boolean;
  share_history: boolean;
  share_costs: boolean;
  view_count: number;
  tire_pressure_unit: tire_pressure_unit;
  // The row toward the tester's account; null leaves the pair untouched.
  follows_me: follow_status | null;
  bikes: BikePlan[];
}

function part(
  key: string,
  component_type: string,
  component_desc: string,
  km: number,
  position: string | null = null,
): PartPlan {
  return { key, component_type, component_desc, position, km };
}

function replaced(action_name: string, part_keys: string[], cost: number | null): ActionPlan {
  return { action_name, part_keys, cost, replacement: true };
}

function worked(action_name: string, part_keys: string[], cost: number | null): ActionPlan {
  return { action_name, part_keys, cost, replacement: false };
}

function leg(pressure_psi: number, sag_percent: number, tokens: number, rebound: number, compression: number): LegPlan {
  return { pressure_psi, sag_percent, tokens, rebound, compression };
}

const megatower: BikePlan = {
  bike_brand: 'Santa Cruz',
  bike_model: 'Megatower C S',
  bikename: 'Mega',
  bike_type: 'Enduro',
  year: 2023,
  wheel_size: '29"',
  bike_size: 'L',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 3850,
  owned_days: 820,
  is_shared: true,
  parts: [
    part('fork', 'Fork', 'RockShox ZEB Ultimate 170', 3850),
    part('shock', 'Shock', 'RockShox Super Deluxe Ultimate', 3850),
    part('chain', 'Chain', 'SRAM GX Eagle', 620),
    part('cassette', 'Cassette', 'SRAM GX Eagle 10-52', 3850),
    part('pads-front', 'Brake pad', 'SRAM Sintered', 410, 'front'),
    part('tire-front', 'Tire', 'Maxxis Assegai 2.5 EXO+', 1400, 'front'),
    part('tire-rear', 'Tire', 'Maxxis Minion DHR II 2.4 DD', 1400, 'rear'),
  ],
  services: [
    {
      days_ago: 170,
      km_ago: 1400,
      place: 'HOME',
      shop_name: null,
      note: 'New tyres before the season.',
      actions: [replaced('Tire Replacement', ['tire-front', 'tire-rear'], 3200)],
    },
    {
      days_ago: 75,
      km_ago: 620,
      place: 'HOME',
      shop_name: null,
      note: 'Chain past 0.75.',
      actions: [replaced('Chain Replacement', ['chain'], 1290)],
    },
    {
      days_ago: 48,
      km_ago: 410,
      place: 'SHOP',
      shop_name: 'Bike Servis Brno',
      note: 'Fork lowers and front pads.',
      actions: [
        replaced('Pads Replacement', ['pads-front'], 690),
        worked('Fork Basic Service', ['fork'], 1900),
      ],
    },
  ],
  setups: [
    {
      name: 'Trail',
      front_tire_psi: 22,
      rear_tire_psi: 25,
      fork: leg(92, 20, 2, 8, 6),
      shock: leg(185, 30, 1, 7, 4),
    },
    {
      name: 'Bike park',
      front_tire_psi: 24,
      rear_tire_psi: 27,
      fork: leg(98, 18, 3, 6, 9),
      shock: leg(195, 28, 2, 5, 7),
    },
  ],
};

const grizl: BikePlan = {
  bike_brand: 'Canyon',
  bike_model: 'Grizl CF SL 8',
  bikename: null,
  bike_type: 'Gravel',
  year: 2022,
  wheel_size: '700c',
  bike_size: 'M',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 6120,
  owned_days: 1100,
  is_shared: true,
  parts: [
    part('chain', 'Chain', 'Shimano CN-HG701', 1850),
    part('cassette', 'Cassette', 'Shimano GRX 11-42', 6120),
    part('pads-front', 'Brake pad', 'Shimano L05A Resin', 6120, 'front'),
    part('tire-front', 'Tire', 'Schwalbe G-One Bite 45', 2300, 'front'),
    part('tire-rear', 'Tire', 'Schwalbe G-One Bite 45', 2300, 'rear'),
  ],
  services: [
    {
      days_ago: 210,
      km_ago: 2300,
      place: 'HOME',
      shop_name: null,
      note: 'Tyres swapped.',
      actions: [replaced('Tire Replacement', ['tire-front', 'tire-rear'], 2100)],
    },
    {
      days_ago: 120,
      km_ago: 1850,
      place: 'HOME',
      shop_name: null,
      note: 'New chain.',
      actions: [replaced('Chain Replacement', ['chain'], 890)],
    },
  ],
  setups: [{ name: 'Default', front_tire_psi: 38, rear_tire_psi: 40, fork: null, shock: null }],
};

const tarmac: BikePlan = {
  bike_brand: 'Specialized',
  bike_model: 'Tarmac SL7 Expert',
  bikename: 'Tarmac',
  bike_type: 'Road',
  year: 2022,
  wheel_size: '700c',
  bike_size: '54',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 9400,
  owned_days: 1300,
  is_shared: true,
  parts: [
    part('chain', 'Chain', 'Shimano Ultegra CN-HG701', 2100),
    part('cassette', 'Cassette', 'Shimano Ultegra R8100 11-30', 9400),
    part('pads-front', 'Brake pad', 'Shimano L05A Resin', 4000, 'front'),
    part('tire-front', 'Tire', 'Continental GP5000 S TR 28', 3100, 'front'),
    part('tire-rear', 'Tire', 'Continental GP5000 S TR 28', 3100, 'rear'),
  ],
  services: [
    {
      days_ago: 260,
      km_ago: 3100,
      place: 'SHOP',
      shop_name: 'Cyklo Kolář',
      note: 'Tyres, set up tubeless.',
      actions: [replaced('Tire Replacement', ['tire-front', 'tire-rear'], 3600)],
    },
    {
      days_ago: 140,
      km_ago: 2100,
      place: 'HOME',
      shop_name: null,
      note: 'Chain.',
      actions: [replaced('Chain Replacement', ['chain'], 1050)],
    },
  ],
  setups: [
    { name: 'Race', front_tire_psi: 78, rear_tire_psi: 82, fork: null, shock: null },
    { name: 'Wet', front_tire_psi: 70, rear_tire_psi: 74, fork: null, shock: null },
  ],
};

const spark: BikePlan = {
  bike_brand: 'Scott',
  bike_model: 'Spark RC Team',
  bikename: null,
  bike_type: 'XC',
  year: 2024,
  wheel_size: '29"',
  bike_size: 'M',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 1750,
  owned_days: 380,
  is_shared: true,
  parts: [
    part('fork', 'Fork', 'Fox 34 SC Performance 120', 1750),
    part('shock', 'Shock', 'Fox Nude 5T', 1750),
    part('chain', 'Chain', 'SRAM GX Eagle T-Type', 1750),
    part('tire-front', 'Tire', 'Maxxis Rekon Race 2.4', 1750, 'front'),
    part('tire-rear', 'Tire', 'Maxxis Rekon Race 2.4', 1750, 'rear'),
  ],
  services: [],
  setups: [
    {
      name: 'XC race',
      front_tire_psi: 20,
      rear_tire_psi: 22,
      fork: leg(85, 18, 2, 9, 5),
      shock: leg(170, 25, 1, 8, 4),
    },
  ],
};

const levo: BikePlan = {
  bike_brand: 'Specialized',
  bike_model: 'Turbo Levo Comp',
  bikename: 'Levo',
  bike_type: 'Enduro',
  year: 2023,
  wheel_size: '29"',
  bike_size: 'S4',
  frame_material: 'Carbon',
  ebike: true,
  total_km: 5200,
  owned_days: 900,
  is_shared: true,
  parts: [
    part('motor', 'Motor', 'Specialized 2.2', 5200),
    part('battery', 'Battery', 'Specialized M3-700', 5200),
    part('fork', 'Fork', 'Fox 36 Rhythm 160', 5200),
    part('shock', 'Shock', 'Fox Float X Performance', 5200),
    part('chain', 'Chain', 'SRAM NX Eagle', 900),
    part('cassette', 'Cassette', 'SRAM NX Eagle 11-50', 5200),
    part('pads-front', 'Brake pad', 'TRP Sintered', 300, 'front'),
  ],
  services: [
    {
      days_ago: 130,
      km_ago: 900,
      place: 'HOME',
      shop_name: null,
      note: 'Third chain on this bike.',
      actions: [replaced('Chain Replacement', ['chain'], 790)],
    },
    {
      days_ago: 35,
      km_ago: 300,
      place: 'SHOP',
      shop_name: 'Specialized Concept Store',
      note: 'Battery check and pads.',
      actions: [
        worked('Battery Check', ['battery'], 500),
        replaced('Pads Replacement', ['pads-front'], 620),
      ],
    },
  ],
  setups: [
    {
      name: 'Default',
      front_tire_psi: 23,
      rear_tire_psi: 26,
      fork: leg(88, 20, 2, 7, 6),
      shock: leg(210, 30, 1, 6, 5),
    },
  ],
};

const laufey: BikePlan = {
  bike_brand: 'Orbea',
  bike_model: 'Laufey H30',
  bikename: 'Hardtail',
  bike_type: 'Trail',
  year: 2021,
  wheel_size: '29"',
  bike_size: 'L',
  frame_material: 'Aluminium',
  ebike: false,
  total_km: 2900,
  owned_days: 1500,
  is_shared: true,
  parts: [
    part('fork', 'Fork', 'Marzocchi Bomber Z2 140', 2900),
    part('chain', 'Chain', 'Shimano Deore M6100', 2900),
    part('tire-front', 'Tire', 'Maxxis Dissector 2.4', 2900, 'front'),
    part('tire-rear', 'Tire', 'Maxxis Rekon 2.4', 2900, 'rear'),
  ],
  services: [
    {
      days_ago: 95,
      km_ago: 700,
      place: 'HOME',
      shop_name: null,
      note: 'Lowers service.',
      actions: [worked('Fork Basic Service', ['fork'], 450)],
    },
  ],
  setups: [{ name: 'Default', front_tire_psi: 24, rear_tire_psi: 27, fork: leg(80, 22, 1, 8, 5), shock: null }],
};

// The one bike kept off its owner's profile.
const supreme: BikePlan = {
  bike_brand: 'Commencal',
  bike_model: 'Supreme DH V5',
  bikename: 'Not shared',
  bike_type: 'DH',
  year: 2022,
  wheel_size: '29"',
  bike_size: 'L',
  frame_material: 'Aluminium',
  ebike: false,
  total_km: 800,
  owned_days: 700,
  is_shared: false,
  parts: [
    part('fork', 'Fork', 'Fox 40 Performance 203', 800),
    part('shock', 'Shock', 'Fox DHX2', 800),
    part('chain', 'Chain', 'SRAM GX DH', 800),
  ],
  services: [],
  setups: [],
};

const fuelEx: BikePlan = {
  bike_brand: 'Trek',
  bike_model: 'Fuel EX 9.8',
  bikename: 'Fuel',
  bike_type: 'Trail',
  year: 2023,
  wheel_size: '29"',
  bike_size: 'M',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 2600,
  owned_days: 640,
  is_shared: true,
  parts: [
    part('fork', 'Fork', 'Fox 36 Factory 150', 2600),
    part('shock', 'Shock', 'Fox Float X Factory', 2600),
    part('chain', 'Chain', 'Shimano XT M8100', 2600),
    part('cassette', 'Cassette', 'Shimano XT M8100 10-51', 2600),
    part('pads-front', 'Brake pad', 'Shimano N03A Resin', 700, 'front'),
    part('seatpost', 'Seatpost', 'Bontrager Line Elite 170', 2600),
    part('tire-front', 'Tire', 'Bontrager XR5 2.5', 2600, 'front'),
    part('tire-rear', 'Tire', 'Bontrager XR4 2.4', 2600, 'rear'),
  ],
  services: [
    {
      days_ago: 150,
      km_ago: 900,
      place: 'SHOP',
      shop_name: 'Kola Šírer',
      note: 'Shock air can service.',
      actions: [worked('Shock Basic Service', ['shock'], 2400)],
    },
    {
      days_ago: 110,
      km_ago: 700,
      place: 'HOME',
      shop_name: null,
      note: 'Front pads.',
      actions: [replaced('Pads Replacement', ['pads-front'], 550)],
    },
    {
      days_ago: 40,
      km_ago: 300,
      place: 'HOME',
      shop_name: null,
      note: 'Dropper was sticky.',
      actions: [worked('Dropper Service', ['seatpost'], null)],
    },
  ],
  setups: [
    {
      name: 'Trail',
      front_tire_psi: 21,
      rear_tire_psi: 24,
      fork: leg(78, 20, 1, 9, 7),
      shock: leg(165, 30, 1, 8, 5),
    },
    {
      name: 'Wet',
      front_tire_psi: 19,
      rear_tire_psi: 22,
      fork: leg(76, 22, 1, 10, 5),
      shock: leg(160, 32, 1, 9, 4),
    },
  ],
};

const spectral: BikePlan = {
  bike_brand: 'Canyon',
  bike_model: 'Spectral CF 8',
  bikename: null,
  bike_type: 'Trail',
  year: 2022,
  wheel_size: '29"',
  bike_size: 'L',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 2100,
  owned_days: 980,
  is_shared: true,
  parts: [
    part('fork', 'Fork', 'Fox 36 Performance Elite 160', 2100),
    part('shock', 'Shock', 'Fox Float X Performance', 2100),
    part('chain', 'Chain', 'Shimano XT M8100', 480),
    part('tire-front', 'Tire', 'Maxxis Minion DHF 2.5', 2100, 'front'),
    part('tire-rear', 'Tire', 'Maxxis Minion DHR II 2.4', 2100, 'rear'),
  ],
  services: [
    {
      days_ago: 60,
      km_ago: 480,
      place: 'HOME',
      shop_name: null,
      note: 'Chain.',
      actions: [replaced('Chain Replacement', ['chain'], 1150)],
    },
  ],
  setups: [
    {
      name: 'Default',
      front_tire_psi: 22,
      rear_tire_psi: 25,
      fork: leg(90, 20, 2, 8, 6),
      shock: leg(200, 30, 1, 7, 5),
    },
  ],
};

const tcr: BikePlan = {
  bike_brand: 'Giant',
  bike_model: 'TCR Advanced 1',
  bikename: 'TCR',
  bike_type: 'Road',
  year: 2020,
  wheel_size: '700c',
  bike_size: 'ML',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 12800,
  owned_days: 2000,
  is_shared: true,
  parts: [
    part('chain', 'Chain', 'Shimano 105 CN-HG601', 3400),
    part('cassette', 'Cassette', 'Shimano 105 R7000 11-30', 12800),
    part('tire-front', 'Tire', 'Vittoria Corsa N.EXT 28', 3400, 'front'),
    part('tire-rear', 'Tire', 'Vittoria Corsa N.EXT 28', 3400, 'rear'),
  ],
  services: [
    {
      days_ago: 300,
      km_ago: 3400,
      place: 'SHOP',
      shop_name: 'Giant Store Praha',
      note: 'Chain and tyres.',
      actions: [
        replaced('Chain Replacement', ['chain'], 750),
        replaced('Tire Replacement', ['tire-front', 'tire-rear'], 2900),
      ],
    },
  ],
  setups: [{ name: 'Default', front_tire_psi: 75, rear_tire_psi: 80, fork: null, shock: null }],
};

const nuroad: BikePlan = {
  bike_brand: 'Cube',
  bike_model: 'Nuroad C:62 Pro',
  bikename: 'Nuroad',
  bike_type: 'Gravel',
  year: 2023,
  wheel_size: '700c',
  bike_size: '53',
  frame_material: 'Carbon',
  ebike: false,
  total_km: 3300,
  owned_days: 560,
  is_shared: true,
  parts: [
    part('chain', 'Chain', 'Shimano CN-HG601', 3300),
    part('cassette', 'Cassette', 'Shimano GRX 11-34', 3300),
    part('tire-front', 'Tire', 'Schwalbe G-One Allround 40', 3300, 'front'),
    part('tire-rear', 'Tire', 'Schwalbe G-One Allround 40', 3300, 'rear'),
  ],
  services: [],
  setups: [{ name: 'Default', front_tire_psi: 40, rear_tire_psi: 42, fork: null, shock: null }],
};

// Three Public, two Followers-only, one Off - and every share switch off somewhere.
export const MOCK_RIDERS: RiderPlan[] = [
  {
    email: 'rider1@bikecheck.local',
    name: 'Tomáš Dvořák',
    handle: 'tomas-dvorak',
    visibility: 'PUBLIC',
    share_components: true,
    share_setup: true,
    share_history: true,
    share_costs: true,
    view_count: 148,
    tire_pressure_unit: 'bar',
    follows_me: 'ACCEPTED',
    bikes: [megatower, grizl],
  },
  {
    // "st" never finds Šťastná - the search has no unaccent.
    email: 'rider2@bikecheck.local',
    name: 'Klára Šťastná',
    handle: 'klara-stastna',
    visibility: 'PUBLIC',
    share_components: true,
    share_setup: true,
    share_history: false,
    share_costs: false,
    view_count: 37,
    tire_pressure_unit: 'bar',
    follows_me: null,
    bikes: [tarmac, spark],
  },
  {
    email: 'rider3@bikecheck.local',
    name: 'Marek Novotný',
    handle: 'marek-novotny',
    visibility: 'PUBLIC',
    share_components: true,
    share_setup: false,
    share_history: true,
    share_costs: false,
    view_count: 512,
    tire_pressure_unit: 'bar',
    follows_me: 'PENDING',
    bikes: [levo, laufey, supreme],
  },
  {
    email: 'rider4@bikecheck.local',
    name: 'Petra Malá',
    handle: 'petra-mala',
    visibility: 'FOLLOWERS',
    share_components: true,
    share_setup: true,
    share_history: true,
    share_costs: true,
    view_count: 0,
    tire_pressure_unit: 'psi',
    follows_me: 'PENDING',
    bikes: [fuelEx],
  },
  {
    email: 'rider5@bikecheck.local',
    name: 'Jakub Černý',
    handle: 'jakub-cerny',
    visibility: 'FOLLOWERS',
    share_components: false,
    share_setup: true,
    share_history: true,
    share_costs: false,
    view_count: 0,
    tire_pressure_unit: 'bar',
    follows_me: null,
    bikes: [spectral, tcr],
  },
  {
    // Follows the tester while their own profile answers to nobody.
    email: 'rider6@bikecheck.local',
    name: 'Lucie Horáková',
    handle: 'lucie-horakova',
    visibility: 'OFF',
    share_components: true,
    share_setup: true,
    share_history: false,
    share_costs: false,
    view_count: 0,
    tire_pressure_unit: 'bar',
    follows_me: 'ACCEPTED',
    bikes: [nuroad],
  },
];
