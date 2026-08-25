import { useEffect, useState } from "react";

// Below this the shrinking viewport is browser chrome collapsing, not a keyboard.
const KEYBOARD_MIN_PX = 60;

// How much of the window the software keyboard covers, in pixels.
//
// A fixed element sits against the bottom of the window, and the Android webview does not
// shrink for the keyboard - `resizeOnFullScreen` is off in capacitor.config.ts - so an
// element pinned there ends up behind the keyboard. The visual viewport does report the
// covered height, which is what a bar the user types into has to be lifted by.
// Related but not the same job as useScrollIntoViewOnFocus, which moves a field in the
// scroll flow above a fixed footer rather than moving the footer itself.
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function read(): void {
      // Not redundant: the narrowing above does not reach inside this listener.
      if (!viewport) return;
      const covered = window.innerHeight - (viewport.height + viewport.offsetTop);
      setOffset(covered > KEYBOARD_MIN_PX ? covered : 0);
    }

    read();
    // Resize reports the keyboard opening; scroll keeps the bar steady while the page is
    // panned with the keyboard already up.
    viewport.addEventListener("resize", read);
    viewport.addEventListener("scroll", read);

    return () => {
      viewport.removeEventListener("resize", read);
      viewport.removeEventListener("scroll", read);
    };
  }, []);

  return offset;
}
