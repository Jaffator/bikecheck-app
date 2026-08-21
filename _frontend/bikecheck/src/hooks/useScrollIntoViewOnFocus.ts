import { useEffect, useRef, type RefObject } from "react";

// Keeps focused Android fields above the keyboard-adjusted visual viewport.
const KEYBOARD_MARGIN_PX = 16;

// Covers devices that do not emit visual viewport resize events.
const FALLBACK_DELAY_MS = 350;

// Measures fixed footer space that obscures the visual viewport.
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
  // Includes visual viewport offset while the keyboard is open.
  const visibleBottom = viewport.height + viewport.offsetTop - obstructionHeight(footerSelector);
  const hiddenBy = rect.bottom + KEYBOARD_MARGIN_PX - visibleBottom;

  if (hiddenBy > 0) {
    window.scrollBy({ top: hiddenBy, behavior: "smooth" });
  }
}

// Returns a container ref that keeps focused fields above the keyboard and footer.
export function useScrollIntoViewOnFocus<T extends HTMLElement>(footerSelector?: string): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  // Retains focus and fallback timer state across viewport events.
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

    // Repositions the focused field during keyboard animation.
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
