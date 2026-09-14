// Lets a finger pull a list that is already at its top to reload it.
import { useEffect, useRef, useState } from "react";

// How far the finger has to travel before letting go reloads rather than springs back.
const PULL_TRIGGER_PX = 70;

// The furthest the list is ever pushed down, however hard the pull.
const MAX_PULL_PX = 96;

// Where the list rests while the reload runs, so the spinner has room to stand.
const SPINNER_PX = 56;

// The list follows the finger at half speed, so the pull feels attached to the screen
// rather than loose.
const RESISTANCE = 0.5;

// How long the list takes to spring back, or to settle under the spinner.
const SETTLE_MS = 200;

export interface PullToRefresh {
  // Goes on the element the gesture is measured against, which is also the element the
  // pull is published on. A callback rather than an object ref because the list it
  // belongs to is mounted after the first paint, and an effect reading a ref that was
  // still empty would attach nothing.
  attach: (node: HTMLDivElement | null) => void;
  // True while the reload itself runs, after the finger has lifted.
  refreshing: boolean;
}

// The pull is written straight onto the element as custom properties rather than kept in
// state: a list of cards re-rendered on every touchmove cannot keep up with a finger, and
// nothing about where the list sits needs React to know about it.
function publish(element: HTMLElement, px: number, settling: boolean): void {
  element.style.setProperty("--pull", `${px}px`);
  element.style.setProperty("--pull-progress", String(Math.min(1, px / PULL_TRIGGER_PX)));
  element.style.setProperty("--pull-transition", settling ? `transform ${SETTLE_MS}ms ease-out` : "none");
}

export function usePullToRefresh(onRefresh: () => Promise<unknown>): PullToRefresh {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The listeners are attached once per element, so everything they read at touch time
  // lives in a ref rather than in the closure they were created with.
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (element === null) return;

    let refreshingNow = false;
    // Where the finger went down, or null between gestures and once a gesture has turned
    // out to be an ordinary scroll.
    let startY: number | null = null;
    let pulling = false;
    let distance = 0;
    // A finger fires moves faster than the screen paints, so only the last one per frame
    // is written.
    let frame = 0;

    function schedule(px: number): void {
      distance = px;
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (element !== null) publish(element, distance, false);
      });
    }

    function settle(px: number): void {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      distance = px;
      if (element !== null) publish(element, px, true);
    }

    function onTouchStart(event: TouchEvent): void {
      // A second finger during a reload, or a list that is not at its top, is not a pull.
      if (refreshingNow || event.touches.length !== 1 || window.scrollY > 0) return;
      startY = event.touches[0].clientY;
      pulling = false;
    }

    function onTouchMove(event: TouchEvent): void {
      if (startY === null) return;

      const dy = event.touches[0].clientY - startY;
      // Upwards is the scroll the list is for, so hand the gesture back and stay out of
      // it until the finger lifts.
      if (dy <= 0 || window.scrollY > 0) {
        startY = null;
        if (pulling) {
          pulling = false;
          settle(0);
        }
        return;
      }

      pulling = true;
      // Stops the WebView answering the same drag with its own overscroll. Once a native
      // scroll has started the event is no longer cancelable, and the pull was never
      // ours to take.
      if (event.cancelable) event.preventDefault();
      schedule(Math.min(MAX_PULL_PX, dy * RESISTANCE));
    }

    async function finishPull(): Promise<void> {
      startY = null;
      if (!pulling) return;
      pulling = false;

      // Too short to have been meant, so the list simply springs back.
      if (distance < PULL_TRIGGER_PX) {
        settle(0);
        return;
      }

      refreshingNow = true;
      setRefreshing(true);
      settle(SPINNER_PX);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingNow = false;
        setRefreshing(false);
        settle(0);
      }
    }

    function onTouchEnd(): void {
      void finishPull();
    }

    function onTouchCancel(): void {
      startY = null;
      pulling = false;
      settle(0);
    }

    // touchmove is not passive: the pull is only ours to keep if the move can be cancelled.
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [element]);

  return { attach: setElement, refreshing };
}
