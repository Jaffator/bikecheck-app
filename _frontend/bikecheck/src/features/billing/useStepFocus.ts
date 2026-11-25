import { useEffect, useRef, type RefObject } from "react";
import type { ProStep } from "./useProSheet";

interface StepFocus {
  field: RefObject<HTMLInputElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
}

// What had focus goes with its step: the key field takes it, or the heading of what came instead.
export function useStepFocus(step: ProStep): StepFocus {
  const field = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const last = useRef(step);

  useEffect(() => {
    // The sheet's first focus is its own; while checking it stays where it was.
    if (last.current === step) return;
    last.current = step;
    if (step === "keyChecking") return;
    const target = step === "key" || step === "keyFailed" ? field : heading;
    // The card is mid-turn: the browser's own scroll would jump the sheet.
    target.current?.focus({ preventScroll: true });
  }, [step]);

  return { field, heading };
}
