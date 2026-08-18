import { useEffect, useRef, type RefObject } from "react";

// On Android the soft keyboard shrinks the viewport instead of scrolling the
// page, so a field near the bottom ends up hidden behind it and the user has to
// scroll by hand. The browser's own scroll-into-view runs before the keyboard
// has resized anything, so it aims at the wrong place — visualViewport is what
// reports the real, keyboard-adjusted height.
const KEYBOARD_MARGIN_PX = 16;

// The delay is not the keyboard animation itself: visualViewport fires while it
// slides, and each event re-runs the check, so this only covers devices that
// never fire one.
const FALLBACK_DELAY_MS = 350;

// A fixed footer sits on top of the page, so the space it covers is not usable
// even though the viewport reports it as visible. Measured rather than hardcoded
// so it keeps up with the footer's own padding and safe-area inset.
function obstructionHeight(selector: string | undefined): number {
  if (!selector) return 0;
  const element = document.querySelector(selector);
  return element ? element.getBoundingClientRect().height : 0;
}

function scrollElementIntoView(element: HTMLElement, footerSelector: string | undefined): void {
  const viewport = window.visualViewport;
  if (!viewport) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const rect = element.getBoundingClientRect();
  // offsetTop is what the page is shifted by when the keyboard is open.
  const visibleBottom = viewport.height + viewport.offsetTop - obstructionHeight(footerSelector);
  const hiddenBy = rect.bottom + KEYBOARD_MARGIN_PX - visibleBottom;

  if (hiddenBy > 0) {
    window.scrollBy({ top: hiddenBy, behavior: "smooth" });
  }
}

// Keeps the focused field above the keyboard. Attach the returned ref to the
// scrolling container; focus is caught as it bubbles, so fields added later are
// covered without registering anything per input.
// Pass a selector for any fixed element covering the bottom of the page (an
// action footer, a tab bar) so the field is scrolled clear of it too.
export function useScrollIntoViewOnFocus<T extends HTMLElement>(footerSelector?: string): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  // Kept across events so a viewport resize knows what to scroll to, and so the
  // fallback timer can be cancelled when a resize arrives first.
  const focusedRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleFocusIn(event: FocusEvent): void {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLInputElement)) return;

      focusedRef.current = target;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        if (focusedRef.current) scrollElementIntoView(focusedRef.current, footerSelector);
      }, FALLBACK_DELAY_MS);
    }

    function handleFocusOut(): void {
      focusedRef.current = null;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    }

    // Fires repeatedly while the keyboard animates, so the field lands in the
    // right place even though the final height is not known up front.
    function handleViewportResize(): void {
      if (focusedRef.current) scrollElementIntoView(focusedRef.current, footerSelector);
    }

    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [footerSelector]);

  return containerRef;
}
