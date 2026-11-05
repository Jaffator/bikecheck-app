import { flushSync } from "react-dom";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type WelcomeDirection = "forward" | "back" | "out";

// Welcome.css reads the direction from the root, where the transition's layers live.
export function welcomeTransition(direction: WelcomeDirection, update: () => void): void {
  // An old WebView has no view transitions, so the change simply happens there.
  if (!("startViewTransition" in document) || window.matchMedia(REDUCED_MOTION).matches) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.welcomeDirection = direction;
  const transition = document.startViewTransition(() => {
    flushSync(update);
  });
  void transition.finished.finally(() => {
    delete root.dataset.welcomeDirection;
  });
}
