import { useEffect, useRef, useState } from "react";

// Ignores small movement to prevent jitter-triggered toggles.
const SCROLL_THRESHOLD = 8;

// Keeps chrome visible near the top and during iOS overscroll.
const ALWAYS_VISIBLE_ABOVE = 24;

// Returns whether scroll-aware chrome should remain visible.
export function useHideOnScrollDown(): boolean {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll(): void {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      if (current <= ALWAYS_VISIBLE_ABOVE) {
        setVisible(true);
        lastScrollY.current = current;
        return;
      }

      // Preserves the reference point so slow drags accumulate.
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;

      setVisible(delta < 0);
      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
