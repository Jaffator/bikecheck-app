import { useEffect, useId, useRef } from "react";
import { useOverlayStore } from "@/store/store";

// Puts an open sheet or modal on the overlay stack, so Android's back gesture (and Esc, via
// the returned "on top") dismisses it rather than the page or the layer under it.
export function useOverlayBack(opened: boolean, onClose: () => void): boolean {
  const pushOverlay = useOverlayStore((state) => state.pushOverlay);
  const removeOverlay = useOverlayStore((state) => state.removeOverlay);
  const id = useId();
  const onTop = useOverlayStore((state) => state.stack[state.stack.length - 1]?.id === id);
  // Retains the latest callback, so re-registering is not needed when it changes.
  const handler = useRef(onClose);

  useEffect(() => {
    handler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!opened) return;

    pushOverlay({ id, close: () => handler.current() });

    return () => removeOverlay(id);
  }, [opened, id, pushOverlay, removeOverlay]);

  return onTop;
}
