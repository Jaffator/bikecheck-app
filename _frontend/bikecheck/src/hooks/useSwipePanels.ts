// Lets a finger drag horizontally between panels that sit side by side in a track.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

// How far a finger travels before the gesture commits to being a swipe rather than a
// scroll. Below this nothing moves, so a vertical flick never nudges the panels.
const DIRECTION_LOCK_PX = 10;

// The share of a panel's width a drag must cover to land on the neighbour rather than
// spring back.
const COMMIT_RATIO = 0.25;

// A short flick lands too, even when it never covered the distance, in pixels per
// millisecond.
const FLICK_VELOCITY = 0.5;

// How long the track takes to settle once the finger lifts.
export const SETTLE_MS = 220;

interface SwipePanels {
  // Spread onto the element that clips the track: it is both what the finger is measured
  // against and what the gesture is captured by.
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  };
  // How far the finger has dragged the track, in pixels. Zero at rest.
  offset: number;
  // True only while a finger is on the track, when it must follow the finger exactly
  // rather than animate towards it.
  dragging: boolean;
  // True while the finger is dragging and until the track has settled afterwards. The
  // panel that is not current only has to be drawn during this window.
  moving: boolean;
}

// Drives a horizontal swipe between `count` panels. The caller owns which panel is
// current: a completed swipe asks for a neighbour and the panel changes when the caller
// says so, exactly as if its tab had been tapped.
export function useSwipePanels(index: number, count: number, onSelect: (next: number) => void): SwipePanels {
  // Where the finger went down, and when, so a flick can be told from a slow drag.
  const origin = useRef<{ x: number; y: number; time: number } | null>(null);
  // Which way the gesture turned out to be. Decided once and then left alone, so a drag
  // that starts sideways is not stolen back by a wobble.
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [dragging, setDragging] = useState(false);

  // The track keeps both panels drawn until it has stopped moving.
  useEffect(() => {
    if (!settling) return;
    const timer = window.setTimeout(() => setSettling(false), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [settling]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>): void => {
    // A right-click drag is not a swipe.
    if (event.pointerType === "mouse" && event.buttons !== 1) return;
    origin.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    axis.current = "undecided";
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const from = origin.current;
      if (from === null) return;

      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;

      if (axis.current === "undecided") {
        // Wait until the finger has said which way it is going.
        if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
        axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        if (axis.current === "horizontal") {
          setDragging(true);
          // Keeps the gesture even if the finger leaves the track mid-drag.
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }

      if (axis.current !== "horizontal") return;

      const width = event.currentTarget.clientWidth || 1;
      // The ends do not wrap, so there is nothing to drag towards past them.
      const furthestLeft = index === count - 1 ? 0 : -width;
      const furthestRight = index === 0 ? 0 : width;
      setOffset(Math.min(furthestRight, Math.max(furthestLeft, dx)));
    },
    [count, index],
  );

  const finish = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const from = origin.current;
      origin.current = null;
      const wasHorizontal = axis.current === "horizontal";
      axis.current = "undecided";
      if (!wasHorizontal || from === null) return;

      const width = event.currentTarget.clientWidth || 1;
      const elapsed = Math.max(1, event.timeStamp - from.time);
      const travelled = Math.abs(offset);
      const landed = travelled > width * COMMIT_RATIO || travelled / elapsed > FLICK_VELOCITY;

      setDragging(false);
      setSettling(true);
      // Dropping the offset in the same commit as the new panel leaves the track to
      // animate only the distance the finger did not cover.
      setOffset(0);
      if (landed) onSelect(offset < 0 ? index + 1 : index - 1);
    },
    [index, offset, onSelect],
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
    offset,
    dragging,
    moving: dragging || settling,
  };
}
