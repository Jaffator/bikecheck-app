// Loads the next page when a sentinel at the end of a list scrolls into view.
import { useEffect, useRef, type RefObject } from "react";

// Attach the returned ref to an element after the last row. Every infinite list in the
// app pages the same way, so they all watch through this.
export function useInfiniteScrollSentinel(
  hasNextPage: boolean,
  fetchNextPage: () => void,
): RefObject<HTMLDivElement | null> {
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Callers pass a fresh arrow on every render. Reading it through a ref keeps it out of
  // the observer's dependencies: re-observing an element already on screen fires
  // isIntersecting again, which would ask for the next page on every render.
  const latest = useRef(fetchNextPage);

  useEffect(() => {
    latest.current = fetchNextPage;
  }, [fetchNextPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (node === null || !hasNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) latest.current();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage]);

  return sentinel;
}
