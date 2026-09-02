import { useEffect, useRef } from "react";
import { useOverlayStore } from "@/store/store";

// Ids only have to be unique among the overlays open at once.
let nextOverlayId = 0;

// Puts an open sheet or modal on the overlay stack, so Android's back gesture dismisses it
// instead of leaving the page underneath it. Closing it any other way removes it again.
export function useOverlayBack(opened: boolean, onClose: () => void): void {
  const pushOverlay = useOverlayStore((state) => state.pushOverlay);
  const removeOverlay = useOverlayStore((state) => state.removeOverlay);
  // Retains the latest callback, so re-registering is not needed when it changes.
  const handler = useRef(onClose);

  useEffect(() => {
    handler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!opened) return;

    const id = nextOverlayId++;
    pushOverlay({ id, close: () => handler.current() });

    return () => removeOverlay(id);
  }, [opened, pushOverlay, removeOverlay]);
}
