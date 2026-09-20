// What the search field sends: the API's bounds, and the typed text as the API wants it.

// Under this the field asks nothing; the API answers 400 below it anyway.
export const SEARCH_MIN_LENGTH = 2;

// The API's other bound; the field cannot be typed past it.
export const SEARCH_MAX_LENGTH = 50;

// How long typing has to pause before the field asks.
export const SEARCH_DEBOUNCE_MS = 300;

// A handle is typed with its @ as often as without; the API matches the handle alone.
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/^@/, "").trim();
}
