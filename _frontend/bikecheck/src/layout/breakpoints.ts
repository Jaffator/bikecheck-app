import { useMediaQuery } from "@mantine/hooks";

// The one width the app turns into a desktop layout at - Mantine's md and Tailwind's
// `desktop:` read the same 62em (ADR 0035).
export const DESKTOP_QUERY = "(min-width: 62em)";

// Read on the first render, so a desktop window never paints the tab bar first.
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY, undefined, { getInitialValueInEffect: false });
}
