// The one motion every bottom sheet makes (docs/conventions/drawers.md).
import type { TransitionOverride } from "@mantine/core";

const ENTER_MS = 400;
const EXIT_MS = 300;

// Arrives fast and settles; leaves slow and speeds up, so the whole exit stays on screen.
const ENTER_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const EXIT_EASING = "cubic-bezier(0.3, 0, 0.8, 0.15)";

export const SHEET_TRANSITION: TransitionOverride = {
  duration: ENTER_MS,
  exitDuration: EXIT_MS,
  timingFunction: ENTER_EASING,
  // No fade, unlike Mantine's slide-up; CSS takes the easing of the state it moves to.
  transition: {
    transitionProperty: "transform",
    common: { transformOrigin: "bottom" },
    in: { transform: "translateY(0)" },
    out: { transform: "translateY(100%)", transitionTimingFunction: EXIT_EASING },
  },
};
