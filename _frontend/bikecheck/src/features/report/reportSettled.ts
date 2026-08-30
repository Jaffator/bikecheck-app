// The print variant tells the printer when it is done. Chromium opens the page, waits for
// this marker and only then captures, so a half-drawn document is never printed.
import { useEffect, useState } from "react";

// What the server waits for: the attribute, and the value that makes its selector exact.
// Spread onto an element rather than written out, so the marker is stated in one place.
export const REPORT_SETTLED_MARKER = { "data-report-settled": "true" } as const;

// True once the fonts are loaded and every image has decoded — the two things that move
// the layout after the first paint.
export function useReportSettled(): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await fontsReady();
      await imagesReady();
      if (cancelled) return;
      // One more frame, so the layout the fonts and images changed is painted before the
      // marker says it is.
      requestAnimationFrame(() => {
        if (!cancelled) setSettled(true);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return settled;
}

async function fontsReady(): Promise<void> {
  await document.fonts?.ready;
}

// A picture that fails to load must not hold the document open forever, so a broken image
// settles the same as a drawn one.
async function imagesReady(): Promise<void> {
  await Promise.all(
    Array.from(document.images).map(async (image) => {
      if (image.complete) return;
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}
