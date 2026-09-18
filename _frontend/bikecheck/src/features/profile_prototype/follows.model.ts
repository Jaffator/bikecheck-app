// PROTOTYPE #128 — throwaway. What every variant of the Follows screen reads and does; the
// variants only differ in how they draw it. Search is debounced and "fetched" with a small
// delay so the loading moment is there to look at.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findPerson, searchPeople, SEARCH_DEBOUNCE_MS, SEARCH_MIN, type FollowStatus, type Person } from "./people";
import { usePrototypeStore } from "./prototype.store";

export type FollowsTab = "following" | "followers";

export interface FollowingRow {
  person: Person;
  status: FollowStatus;
}

export interface SearchState {
  query: string;
  setQuery: (value: string) => void;
  // Null until the query is long enough to ask (#123 min 2 chars).
  results: Person[] | null;
  searching: boolean;
  // The cap was hit: the list is the first 20, not all of them.
  capped: boolean;
}

export interface FollowsModel {
  search: SearchState;
  // Whom I follow and whom I asked, one list (#124 GET /follows/following).
  following: FollowingRow[];
  // Who asked me (PENDING) and who follows me (ACCEPTED), split as the tab shows them.
  requests: Person[];
  followers: Person[];
  accept: (handle: string) => void;
  // Decline and remove are one act on the row (#124): it is gone.
  remove: (handle: string) => void;
  restore: (handle: string, status: FollowStatus) => void;
  openProfile: (handle: string) => void;
}

function rowsOf(relations: Record<string, FollowStatus>, status?: FollowStatus): FollowingRow[] {
  return Object.entries(relations)
    .filter(([, value]) => status === undefined || value === status)
    .flatMap(([handle, value]) => {
      const person = findPerson(handle);
      return person ? [{ person, status: value }] : [];
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name, "cs"));
}

function useSearch(): SearchState {
  const myHandle = usePrototypeStore((state) => state.handle);
  const [query, setQueryValue] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [capped, setCapped] = useState(false);
  const [searching, setSearching] = useState(false);
  const askable = query.trim().length >= SEARCH_MIN;

  // Typing settles the synchronous part at once; the "fetch" lands from the timer below.
  function setQuery(value: string): void {
    setQueryValue(value);
    const long = value.trim().length >= SEARCH_MIN;
    setSearching(long);
    if (!long) {
      setResults(null);
      setCapped(false);
    }
  }

  useEffect(() => {
    if (!askable) return;
    const timer = window.setTimeout(() => {
      const found = searchPeople(query, myHandle);
      setResults(found.rows);
      setCapped(found.capped);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS + 150);
    return () => window.clearTimeout(timer);
  }, [query, askable, myHandle]);

  return { query, setQuery, results, searching, capped };
}

export function useFollowsModel(): FollowsModel {
  const followingMap = usePrototypeStore((state) => state.following);
  const followersMap = usePrototypeStore((state) => state.followers);
  const accept = usePrototypeStore((state) => state.accept);
  const remove = usePrototypeStore((state) => state.removeFollower);
  const restore = usePrototypeStore((state) => state.restoreFollower);
  const navigate = useNavigate();
  const search = useSearch();

  return {
    search,
    following: rowsOf(followingMap),
    requests: rowsOf(followersMap, "PENDING").map((row) => row.person),
    followers: rowsOf(followersMap, "ACCEPTED").map((row) => row.person),
    accept,
    remove,
    restore,
    openProfile: (handle) => navigate(`/users/${handle}`),
  };
}
