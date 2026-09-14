// A press that keeps stepping while it is held. A tap is the browser's own click, so a finger
// that lands on the button and scrolls away steps nothing - the browser never fires the click.
// A hold waits a moment, then steps every few dozen milliseconds until the finger or mouse
// lets go; the click that follows the release is swallowed so it does not add one more.
import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

// Long enough that a tap never repeats; short enough that a hold is felt as one.
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 90;

export interface HoldRepeatHandlers {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function useHoldRepeat(step: () => void): HoldRepeatHandlers {
  // The latest step, so a hold that outlives a render keeps stepping from the current value.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const delay = useRef<number | null>(null);
  const interval = useRef<number | null>(null);
  // Whether the hold got going; its release still fires a click, which must not step again.
  const held = useRef(false);

  // The release listener is the stop itself; held in a ref so it can take itself off the window.
  const stopRef = useRef<() => void>(() => {});
  const stop = useCallback((): void => {
    if (delay.current !== null) window.clearTimeout(delay.current);
    if (interval.current !== null) window.clearInterval(interval.current);
    delay.current = null;
    interval.current = null;
    window.removeEventListener("pointerup", stopRef.current);
    window.removeEventListener("pointercancel", stopRef.current);
    // The click lands right after the release; the flag is cleared once it has passed.
    window.setTimeout(() => {
      held.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  // Nothing keeps ticking after the button is gone.
  useEffect(() => stop, [stop]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return;
    delay.current = window.setTimeout(() => {
      held.current = true;
      stepRef.current();
      interval.current = window.setInterval(() => stepRef.current(), REPEAT_MS);
    }, HOLD_DELAY_MS);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const onClick = (): void => {
    if (held.current) return;
    stepRef.current();
  };

  // A long press on a phone would otherwise open the context menu mid-hold.
  const onContextMenu = (event: MouseEvent<HTMLButtonElement>): void => event.preventDefault();

  return { onPointerDown, onClick, onContextMenu };
}
