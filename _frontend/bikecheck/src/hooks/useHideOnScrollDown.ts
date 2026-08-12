import { useEffect, useRef, useState } from "react";

// Movement below this is ignored, so a jittery finger or a rubber-band bounce
// does not toggle the element.
const SCROLL_THRESHOLD = 8;

// Near the top there is nothing worth hiding for, and iOS overscroll reports
// negative offsets that would otherwise read as an upward scroll.
const ALWAYS_VISIBLE_ABOVE = 24;

// True while the page is scrolling up (or sitting near the top), false while it
// scrolls down. Drives chrome that should retreat out of the way while reading.
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

      // Below the threshold the reference point stays put, so slow drags
      // accumulate into a direction change instead of being discarded.
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;

      setVisible(delta < 0);
      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
