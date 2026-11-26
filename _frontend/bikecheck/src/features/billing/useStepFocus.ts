import { useEffect, useRef, type RefObject } from "react";
import type { ProStep } from "./useProSheet";

interface StepFocus {
  field: RefObject<HTMLInputElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
}

// What had focus goes with its step: the key field takes it, or the heading of what came instead.
export function useStepFocus(step: ProStep, showsBack: boolean): StepFocus {
  const field = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const last = useRef(step);

  useEffect(() => {
    // The sheet's first focus is its own.
    if (last.current === step) return;
    last.current = step;
    const target = showsBack ? field : heading;
    // The card is mid-turn: the browser's own scroll would jump the sheet.
    target.current?.focus({ preventScroll: true });
  }, [step, showsBack]);

  return { field, heading };
}
