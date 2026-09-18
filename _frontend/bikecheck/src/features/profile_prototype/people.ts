// PROTOTYPE #128 — throwaway. The other riders: who can be found (#123) and how a search
// over them behaves. Nothing here talks to the backend.
import type { Visibility } from "./prototype.store";

export interface Person {
  handle: string;
  name: string;
  visibility: Visibility;
}

// Where the seeker stands with a person: outgoing (#124 /follows/following) or incoming
// (#124 /follows/followers). No row means nothing between them.
export type FollowStatus = "PENDING" | "ACCEPTED";

const NAMED: Person[] = [
  { handle: "martin-k", name: "Martin Kučera", visibility: "PUBLIC" },
  { handle: "verca", name: "Veronika Šťastná", visibility: "FOLLOWERS" },
  { handle: "tomas_h", name: "Tomáš Hájek", visibility: "PUBLIC" },
  { handle: "lucie.b", name: "Lucie Bártová", visibility: "FOLLOWERS" },
  { handle: "pepa-mtb", name: "Josef Novák", visibility: "PUBLIC" },
  { handle: "anet", name: "Aneta Dvořáková", visibility: "FOLLOWERS" },
  { handle: "honza-gravel", name: "Jan Procházka", visibility: "PUBLIC" },
  { handle: "kata", name: "Kateřina Malá", visibility: "PUBLIC" },
  { handle: "ondra_enduro", name: "Ondřej Sedláček", visibility: "FOLLOWERS" },
  { handle: "michal", name: "Michal Marek", visibility: "OFF" },
  { handle: "zuzka", name: "Zuzana Veselá", visibility: "PUBLIC" },
  { handle: "radek-r", name: "Radek Růžička", visibility: "FOLLOWERS" },
];

// Enough "rider" accounts that a search for "ri" overflows the 20-row cap (#123).
const RIDERS: Person[] = Array.from({ length: 24 }, (_, index) => ({
  handle: `rider${String(index + 1).padStart(2, "0")}`,
  name: `Rider ${index + 1}`,
  visibility: index % 3 === 0 ? "FOLLOWERS" : "PUBLIC",
}));

export const PEOPLE: Person[] = [...NAMED, ...RIDERS];

export const SEARCH_MIN = 2;
export const SEARCH_CAP = 20;
// Ordering ties the mock to what the backend will do, so the list reads the same.
export const SEARCH_DEBOUNCE_MS = 300;

export function findPerson(handle: string): Person | undefined {
  return PEOPLE.find((person) => person.handle === handle);
}

function matchesHandle(person: Person, query: string): boolean {
  return person.handle.startsWith(query);
}

function matchesName(person: Person, query: string): boolean {
  return person.name
    .toLowerCase()
    .split(/\s+/)
    .some((word) => word.startsWith(query));
}

// #123: handle prefix, then a word of the name, case-insensitive, no unaccent. Only
// Discoverable rows; the seeker never finds themself. Capped, with a flag saying so.
export function searchPeople(rawQuery: string, myHandle: string): { rows: Person[]; capped: boolean } {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < SEARCH_MIN) return { rows: [], capped: false };

  const hits = PEOPLE.filter(
    (person) =>
      person.visibility !== "OFF" && person.handle !== myHandle && (matchesHandle(person, query) || matchesName(person, query)),
  );
  hits.sort((a, b) => {
    const aHandle = matchesHandle(a, query) ? 0 : 1;
    const bHandle = matchesHandle(b, query) ? 0 : 1;
    if (aHandle !== bHandle) return aHandle - bHandle;
    return a.handle.localeCompare(b.handle);
  });

  return { rows: hits.slice(0, SEARCH_CAP), capped: hits.length > SEARCH_CAP };
}
