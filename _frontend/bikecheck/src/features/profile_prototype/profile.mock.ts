// PROTOTYPE #129 — throwaway. Somebody else's garage, as the profile endpoint (#126) would
// hand it over: bikes with the parts, setup and history the owner shares. The three bikes
// are the design's (Design/Live Bikecheck report), so the app page and the web page read
// the same machine. Nothing here talks to the backend.
import type { SectionKey } from "./prototype.store";

export interface MockPart {
  type: string;
  // Which side, where the type comes in pairs.
  position: "Přední" | "Zadní" | null;
  brand: string;
  model: string;
  spec: string;
  // Fitted when: a date, or "od nového kola".
  since: string;
  km: number | null;
}

export interface MockCategory {
  // The seeded group name groupIcon() knows; anything else takes the fallback mark.
  group: string;
  name: string;
  parts: MockPart[];
}

export interface MockService {
  id: number;
  date: string | null;
  actions: string[];
  parts: string[];
  replacement: boolean;
  cost: number | null;
}

// Clicks are counted from fully closed, as the setup screen counts them (ADR 0029).
export interface MockClicks {
  lsr: number;
  hsr: number;
  lsc: number;
  hsc: number;
}

export interface MockSetupProfile {
  name: string;
  // Mirrors is_active: the one profile the owner rides right now, so a follower can tell.
  active: boolean;
  frontTire: number;
  rearTire: number;
  fork: { psi: number; sag: number; tokens: number; clicks: MockClicks } | null;
  shock: { psi: number; sag: number; tokens: number; clicks: MockClicks } | null;
}

// The card opens on the active profile, never on whichever happens to be first.
export function activeProfileIndex(bike: MockBike): number {
  return Math.max(0, bike.profiles.findIndex((profile) => profile.active));
}

export interface MockBike {
  id: number;
  name: string;
  model: string;
  chips: string[];
  km: number;
  hours: number;
  photo: string | null;
  categories: MockCategory[];
  services: MockService[];
  // Empty when the owner never saved one: the card is absent (#120).
  profiles: MockSetupProfile[];
}

export interface MockGarage {
  bikes: MockBike[];
  sections: Record<SectionKey, boolean>;
  tireUnit: "psi" | "bar";
  currency: string;
  updated: string;
}

function part(type: string, position: MockPart["position"], brand: string, model: string, spec: string, since = "od nového kola", km: number | null = null): MockPart {
  return { type, position, brand, model, spec, since, km };
}

const RALLON_CATEGORIES: MockCategory[] = [
  {
    group: "Suspension",
    name: "Odpružení",
    parts: [
      part("Vidlice", null, "Fox", "38 Factory GRIP2", "170 mm · 29″ · Kabolt-X 15×110", "od nového kola", 4187),
      part("Tlumič", null, "Fox", "Float X2 Factory", "205 × 65 mm · trunnion", "od nového kola", 4187),
    ],
  },
  {
    group: "Frame",
    name: "Rám",
    parts: [
      part("Rám", null, "Orbea", "Rallon M-LTD", "carbon OMR · vel. L · 2023", "4. 4. 2023", 4187),
      part("Hanger", null, "Orbea", "1042 UDH", "UDH kompatibilní", "8. 8. 2026", 210),
    ],
  },
  {
    group: "Cockpit",
    name: "Kokpit",
    parts: [
      part("Hlavové složení", null, "Acros", "Blocklock", "ZS56/28,6 · ZS56/40"),
      part("Představec", null, "Race Face", "Turbine R 35", "40 mm · 35 mm · 0°"),
      part("Řídítka", null, "OneUp", "Carbon Handlebar", "800 mm · 35 mm · rise 20 mm", "21. 4. 2026", 1420),
      part("Gripy", null, "Ergon", "GA3", "vel. L · černá", "21. 4. 2026", 1420),
    ],
  },
  {
    group: "Saddle & Seatpost",
    name: "Sedlo a sedlovka",
    parts: [
      part("Sedlo", null, "Ergon", "SM Enduro Comp", "M/L · 145 mm"),
      part("Sedlovka", null, "OneUp", "Dropper V2", "210 mm zdvih · 31,6 mm"),
    ],
  },
  {
    group: "Wheels",
    name: "Kola",
    parts: [
      part("Ráfek", "Přední", "DT Swiss", "EX 511", "29″ · 30 mm vnitřní · 32 děr"),
      part("Ráfek", "Zadní", "DT Swiss", "EX 511", "29″ · 30 mm vnitřní · 32 děr"),
      part("Plášť", "Přední", "Maxxis", "Assegai", "29×2.5 · EXO+ · MaxxGrip", "12. 6. 2026", 890),
      part("Plášť", "Zadní", "Maxxis", "Minion DHR II", "29×2.4 · DoubleDown · MaxxTerra", "12. 6. 2026", 890),
      part("Náboj", "Přední", "DT Swiss", "240 EXP", "Boost 110 · 6-bolt"),
      part("Náboj", "Zadní", "DT Swiss", "240 EXP", "Boost 148 · XD · 36T ratchet"),
      part("Inserty", null, "Cushcore", "Pro", "29″ · přední + zadní", "12. 6. 2026", 890),
      part("Tmel", null, "Stan's", "Race Sealant", "90 ml / kolo", "doplněno 12. 8. 2026", 180),
    ],
  },
  {
    group: "Drivetrain",
    name: "Pohon",
    parts: [
      part("Řadicí páka", null, "SRAM", "XX Eagle AXS", "12sp · Pod"),
      part("Přehazovačka", null, "SRAM", "XX Eagle AXS Transmission", "12sp · T-Type"),
      part("Kliky", null, "SRAM", "XX Eagle", "165 mm · DUB"),
      part("Převodník", null, "SRAM", "XX T-Type", "32T · 55 mm chainline", "21. 4. 2026", 1420),
      part("Řetěz", null, "SRAM", "XX Eagle Flattop", "12sp", "21. 4. 2026", 1420),
      part("Kazeta", null, "SRAM", "XS-1299", "10–52", "21. 4. 2026", 1420),
    ],
  },
  {
    group: "Brakes",
    name: "Brzdy",
    parts: [
      part("Brzdové páky", null, "SRAM", "Code Ultimate Stealth", "4-píst · carbon páčka"),
      part("Kotouč", "Přední", "SRAM", "HS2", "220 mm"),
      part("Kotouč", "Zadní", "SRAM", "HS2", "200 mm"),
      part("Destičky", "Přední", "SRAM", "Code", "metalické", "21. 4. 2026", 1420),
      part("Destičky", "Zadní", "SRAM", "Code", "metalické", "21. 4. 2026", 1420),
    ],
  },
  {
    group: "Ostatní",
    name: "Ostatní",
    parts: [part("Pedály", null, "Crankbrothers", "Mallet E", "nášlapné · dlouhá osa")],
  },
];

// [date, actions, parts, replacement, cost] — 26 rows, so "Zobrazit starší" has work.
type ServiceRow = [string | null, string[], string[], boolean, number | null];

function services(rows: ServiceRow[]): MockService[] {
  return rows.map(([date, actions, parts, replacement, cost], index) => ({ id: index + 1, date, actions, parts, replacement, cost }));
}

const RALLON_SERVICES = services([
  ["2026-08-12", ["Doplnění tmelu"], ["Tmel"], false, 220],
  ["2026-08-08", ["Výměna dílu", "Kontrola geometrie"], ["Hanger", "Přehazovačka"], true, 450],
  ["2026-07-19", ["Voskování řetězu"], ["Řetěz"], false, null],
  ["2026-06-12", ["Výměna oleje", "Výměna prachovek", "Mazání", "Výměna dílu"], ["Vidlice", "Sedlovka", "Plášť přední", "Plášť zadní", "Inserty"], true, 5640],
  ["2026-05-24", ["Kontrola utažení", "Čištění"], ["Řídítka", "Pedály"], false, null],
  ["2026-04-21", ["Výměna dílu", "Seřízení"], ["Řetěz", "Kazeta", "Převodník", "Destičky přední", "Destičky zadní", "Řídítka", "Gripy"], true, 8130],
  ["2026-03-04", ["Základní servis", "Centrování", "Odvzdušnění"], ["Tlumič", "Ráfek přední", "Ráfek zadní", "Brzdové páky"], false, 3900],
  ["2026-01-17", ["Voskování řetězu"], ["Řetěz"], false, null],
  ["2025-11-30", ["Výměna ložisek"], ["Středové složení", "Hlavové složení"], true, 2450],
  ["2025-10-11", ["Výměna destiček"], ["Destičky přední", "Destičky zadní"], true, 890],
  ["2025-09-06", ["Doplnění tmelu"], ["Tmel"], false, 220],
  ["2025-08-15", ["Výměna oleje", "Výměna prachovek"], ["Vidlice"], false, 2900],
  ["2025-07-02", ["Výměna dílu"], ["Plášť zadní"], true, 1390],
  ["2025-06-14", ["Centrování"], ["Ráfek přední", "Ráfek zadní"], false, 600],
  ["2025-05-03", ["Voskování řetězu", "Čištění"], ["Řetěz", "Kazeta"], false, null],
  ["2025-04-12", ["Odvzdušnění"], ["Brzdové páky"], false, 700],
  ["2025-03-22", ["Výměna dílu"], ["Řetěz"], true, 1250],
  ["2025-02-08", ["Základní servis"], ["Vidlice", "Tlumič"], false, 4800],
  ["2024-12-14", ["Výměna dílu"], ["Gripy"], true, 450],
  ["2024-11-02", ["Doplnění tmelu"], ["Tmel"], false, 220],
  ["2024-09-21", ["Výměna destiček"], ["Destičky přední"], true, 445],
  ["2024-08-10", ["Výměna dílu", "Seřízení"], ["Kazeta", "Řetěz"], true, 3200],
  ["2024-06-29", ["Výměna oleje"], ["Sedlovka"], false, 1100],
  ["2024-05-18", ["Centrování", "Kontrola utažení"], ["Ráfek zadní", "Náboj zadní"], false, 600],
  [null, ["Odvzdušnění"], ["Brzdové páky"], false, null],
  [null, ["Výměna dílu"], ["Pedály"], true, 1890],
]);

const RALLON: MockBike = {
  id: 1,
  name: "Orbea Rallon",
  model: "M-Team",
  chips: ["2023", "Enduro · 170/160 mm", "vel. L"],
  km: 4187,
  hours: 312,
  photo: "/prototype/rallon.webp",
  categories: RALLON_CATEGORIES,
  services: RALLON_SERVICES,
  profiles: [
    { name: "Trail", active: false, frontTire: 22.5, rearTire: 25.4, fork: { psi: 82, sag: 20, tokens: 2, clicks: { lsr: 8, hsr: 3, lsc: 10, hsc: 2 } }, shock: { psi: 195, sag: 30, tokens: 1, clicks: { lsr: 9, hsr: 2, lsc: 12, hsc: 1 } } },
    { name: "Race", active: true, frontTire: 23.9, rearTire: 26.8, fork: { psi: 88, sag: 18, tokens: 3, clicks: { lsr: 7, hsr: 3, lsc: 8, hsc: 3 } }, shock: { psi: 205, sag: 28, tokens: 2, clicks: { lsr: 8, hsr: 2, lsc: 10, hsc: 2 } } },
    { name: "Park", active: false, frontTire: 24.7, rearTire: 27.6, fork: { psi: 90, sag: 17, tokens: 3, clicks: { lsr: 6, hsr: 2, lsc: 7, hsc: 4 } }, shock: { psi: 210, sag: 27, tokens: 2, clicks: { lsr: 7, hsr: 1, lsc: 9, hsc: 3 } } },
  ],
};

const GRIZL: MockBike = {
  id: 2,
  name: "Canyon Grizl",
  model: "CF SL 7",
  chips: ["2022", "Gravel", "vel. M"],
  km: 3905,
  hours: 168,
  photo: null,
  categories: [
    { group: "Frame", name: "Rám", parts: [part("Rám", null, "Canyon", "Grizl CF SL", "carbon · 700c · M")] },
    { group: "Cockpit", name: "Kokpit", parts: [part("Řídítka", null, "Canyon", "HB43 Ergobar", "440 mm · flare 16°"), part("Představec", null, "Canyon", "V13", "90 mm")] },
    { group: "Saddle & Seatpost", name: "Sedlo a sedlovka", parts: [part("Sedlo", null, "Fizik", "Terra Argo X5", "150 mm"), part("Sedlovka", null, "Canyon", "S15 VCLS", "27,2 mm · carbon")] },
    {
      group: "Wheels",
      name: "Kola",
      parts: [part("Plášť", "Přední", "Schwalbe", "G-One R", "45-622 · TLE", "15. 3. 2026", 1230), part("Plášť", "Zadní", "Schwalbe", "G-One R", "45-622 · TLE", "15. 3. 2026", 1230)],
    },
    { group: "Drivetrain", name: "Pohon", parts: [part("Řetěz", null, "Shimano", "CN-M8100", "12sp"), part("Kazeta", null, "Shimano", "GRX CS-M8100", "10–51")] },
    { group: "Brakes", name: "Brzdy", parts: [part("Brzdové páky", null, "Shimano", "GRX ST-RX820", "hydraulické")] },
  ],
  services: services([
    ["2026-07-05", ["Voskování řetězu"], ["Řetěz"], false, null],
    ["2026-03-15", ["Výměna dílu"], ["Plášť přední", "Plášť zadní"], true, 2380],
    ["2025-10-20", ["Odvzdušnění"], ["Brzdové páky"], false, 700],
    [null, ["Základní servis"], ["Středové složení"], false, 900],
  ]),
  profiles: [{ name: "Default", active: true, frontTire: 37.7, rearTire: 40.6, fork: null, shock: null }],
};

const HONZO: MockBike = {
  id: 3,
  name: "Kona Honzo",
  model: "ESD",
  chips: ["2021", "Trail HT · 140 mm", "vel. L"],
  km: 1320,
  hours: 96,
  photo: null,
  categories: [
    { group: "Suspension", name: "Odpružení", parts: [part("Vidlice", null, "RockShox", "Pike Select", "140 mm · 29″")] },
    { group: "Frame", name: "Rám", parts: [part("Rám", null, "Kona", "Honzo ESD", "ocel · L")] },
    { group: "Cockpit", name: "Kokpit", parts: [part("Řídítka", null, "Kona", "XC/BC 35", "800 mm · 35 mm rise")] },
    { group: "Wheels", name: "Kola", parts: [part("Plášť", "Přední", "Maxxis", "Assegai", "29×2.5 · EXO+"), part("Plášť", "Zadní", "Maxxis", "Dissector", "29×2.4 · EXO+")] },
    {
      group: "Drivetrain",
      name: "Pohon",
      parts: [part("Řetěz", null, "SRAM", "GX Eagle", "12sp", "8. 11. 2025", 640), part("Kazeta", null, "SRAM", "GX Eagle XG-1275", "10–52", "8. 11. 2025", 640)],
    },
    { group: "Ostatní", name: "Ostatní", parts: [part("Pedály", null, "OneUp", "Composite", "platformy")] },
  ],
  services: services([
    ["2026-05-30", ["Výměna oleje"], ["Vidlice"], false, 2600],
    ["2025-11-08", ["Výměna dílu"], ["Řetěz", "Kazeta"], true, 2900],
    ["2025-04-19", ["Doplnění tmelu"], ["Tmel"], false, 220],
  ]),
  // Never saved a Setup: the card is simply not there.
  profiles: [],
};

export const ALL_SECTIONS: Record<SectionKey, boolean> = { components: true, setup: true, history: true, costs: true };

// What each rider shares, so the profiles differ in more than the name: one shares it all,
// one hides history, one hides setup, one hides parts and prices.
const GARAGES: Record<string, MockGarage> = {
  "martin-k": { bikes: [RALLON, GRIZL, HONZO], sections: ALL_SECTIONS, tireUnit: "psi", currency: "CZK", updated: "před 3 dny" },
  tomas_h: { bikes: [GRIZL, HONZO], sections: { components: true, setup: true, history: false, costs: false }, tireUnit: "bar", currency: "EUR", updated: "před 2 týdny" },
  verca: { bikes: [RALLON], sections: { components: true, setup: false, history: true, costs: false }, tireUnit: "psi", currency: "CZK", updated: "včera" },
  kata: { bikes: [HONZO], sections: { components: false, setup: true, history: true, costs: true }, tireUnit: "bar", currency: "CZK", updated: "před 5 týdny" },
  "honza-gravel": { bikes: [GRIZL], sections: ALL_SECTIONS, tireUnit: "bar", currency: "CZK", updated: "před 8 dny" },
};

const DEFAULT_GARAGE: MockGarage = {
  bikes: [HONZO],
  sections: { components: true, setup: false, history: false, costs: false },
  tireUnit: "bar",
  currency: "CZK",
  updated: "před měsícem",
};

// My own garage for the preview at /users/<me>: the full three bikes, the switches from
// the share drawer (#121). The real thing would read my bikes; the mock keeps one set so
// the bike page has parts and history to show.
export const MY_GARAGE: MockGarage = { bikes: [RALLON, GRIZL, HONZO], sections: ALL_SECTIONS, tireUnit: "bar", currency: "CZK", updated: "právě teď" };

export function garageFor(handle: string): MockGarage {
  return GARAGES[handle] ?? DEFAULT_GARAGE;
}

export function partCount(bike: MockBike): number {
  return bike.categories.reduce((sum, category) => sum + category.parts.length, 0);
}

// The mounted tire under the pressure, looked up by its slot (#120).
export function mountedTire(bike: MockBike, position: "Přední" | "Zadní"): MockPart | null {
  for (const category of bike.categories) {
    const tire = category.parts.find((item) => item.type === "Plášť" && item.position === position);
    if (tire) return tire;
  }
  return null;
}
