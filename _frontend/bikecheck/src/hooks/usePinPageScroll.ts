import { useCallback } from "react";

// How long a dropdown takes to focus its target, mount and position itself.
const SETTLE_MS = 250;

// Opening a Mantine Select moves the page: it focuses its read-only target and scrolls the
// active option into view, and both of those walk up to the document scroller because the
// dropdown renders in a portal. Nothing about opening a dropdown should move the page, so
// hold the page where the user left it until the dropdown has settled. Call it on the
// pointer press, before the focus that scrolls.
export function usePinPageScroll(): () => void {
  return useCallback(() => {
    const top = window.scrollY;

    function hold(): void {
      if (window.scrollY !== top) window.scrollTo({ top, behavior: "instant" });
    }

    window.addEventListener("scroll", hold);
    window.setTimeout(() => window.removeEventListener("scroll", hold), SETTLE_MS);
  }, []);
}
