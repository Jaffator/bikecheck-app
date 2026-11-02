// What the search field and its results share: the typed text read as a query, and the answer to it.
import { useDebouncedValue } from "@mantine/hooks";
import type { UseQueryResult } from "@tanstack/react-query";
import { useFollowSearch } from "./follow.queries";
import { normalizeQuery, SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH } from "./followSearch";
import type { FollowSearchResponse } from "./follow.types";

export interface TypedFollowSearch {
  // Long enough to be asked; shorter text leaves the list where it was.
  askable: boolean;
  // Busy from the first keystroke past the minimum until the answer to the last one lands.
  searching: boolean;
  search: UseQueryResult<FollowSearchResponse>;
}

export function useTypedFollowSearch(typed: string): TypedFollowSearch {
  const query = normalizeQuery(typed);
  const askable = query.length >= SEARCH_MIN_LENGTH;
  const [settled] = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const search = useFollowSearch(settled);
  const searching = askable && (settled !== query || search.isFetching);

  return { askable, searching, search };
}
