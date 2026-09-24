// How wide the app runs in a browser. One phone-and-a-half: the cards were drawn for a
// phone, and past this a photo card or a progress bar stops reading as one thing. The
// header, the page and the tab bar share it, so the title stays over the content.
export const CONTENT_MAX_WIDTH = "44rem";

// The tab bar and the pinned bars keep the phone's inset inside the column.
export const BAR_WIDTH = `min(92%, calc(${CONTENT_MAX_WIDTH} - 2rem))`;

// On desktop the overviews lay themselves out in columns; everything read top to bottom
// keeps the column above (ADR 0035).
export const WIDE_CONTENT_MAX_WIDTH = "75rem";

// The desktop sidebar's width; here so the pinned bars can be offset by it too.
export const SIDEBAR_WIDTH = 240;

// On desktop a pinned bar belongs to the page, not the window (ADR 0035).
export const PINNED_BAR_LEFT = { base: 0, md: SIDEBAR_WIDTH };
export const PINNED_BAR_WIDTH = { base: "92%", md: BAR_WIDTH };

// Home, the garage, one bike, Service and Rides - matched whole, so their forms stay narrow.
const WIDE_ROUTES: RegExp[] = [/^\/$/, /^\/bikes$/, /^\/bikes\/\d+$/, /^\/service$/, /^\/rides$/];

export function isWideRoute(pathname: string): boolean {
  return WIDE_ROUTES.some((pattern) => pattern.test(pathname));
}
