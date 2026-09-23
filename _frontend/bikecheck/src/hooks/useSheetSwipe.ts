// Lets a finger drag a bottom sheet down and drop it, the way the phone's own sheets close.
import { useCallback } from "react";

// How far down the sheet a drag may start: the grabber and the sheet's own heading, which is
// where a hand reaches for a sheet. Below it the content is worked with rather than moved.
const GRAB_ZONE_PX = 120;

// How far a finger travels before the gesture commits to being a drag rather than a scroll.
const DIRECTION_LOCK_PX = 10;

// The share of the sheet's own height a drag must cover to dismiss it rather than spring
// back. A ratio, because a sheet is as tall as its content.
const COMMIT_RATIO = 0.25;

// A short flick dismisses too, in pixels per millisecond - the figure the panel swipe uses.
const FLICK_VELOCITY = 0.25;

// A flick has to cover at least this much, so a twitch never closes the sheet.
const FLICK_MIN_PX = 24;

// The third axis is what asks the browser for a layer of its own rather than a repaint.
const translate = (offset: number): string => `translate3d(0, ${offset}px, 0)`;

interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  time: number;
  offset: number;
  // Decided once the finger has said which way it is going, and then left alone: a gesture
  // that turned out to be a scroll never becomes a drag halfway through.
  dragging: boolean;
  abandoned: boolean;
  // The transition the sheet wears between gestures.
  duration: string;
}

// Attach to any element inside the sheet; the gesture is read from the sheet itself, so
// nothing is laid over the content and every tap below it still lands.
export function useSheetSwipe(onClose: () => void): (node: HTMLElement | null) => void {
  return useCallback(
    (node: HTMLElement | null) => {
      const sheet = node?.closest<HTMLElement>('[role="dialog"]');
      if (!sheet) return;

      let gesture: Gesture | null = null;
      let frame = 0;

      // Several moves can arrive between two frames; only the last one is worth painting.
      const paint = (): void => {
        frame = 0;
        if (gesture !== null && gesture.dragging) sheet.style.transform = translate(gesture.offset);
      };

      // A list the reader has scrolled into is being read, not dragged.
      const scrolled = (target: EventTarget | null): boolean => {
        let element = target instanceof Element ? target : null;
        while (element !== null && element !== sheet) {
          if (element.scrollTop > 0) return true;
          element = element.parentElement;
        }
        return sheet.scrollTop > 0;
      };

      const down = (event: PointerEvent): void => {
        // A right-click drag is not a swipe.
        if (event.pointerType === "mouse" && event.buttons !== 1) return;
        if (event.clientY - sheet.getBoundingClientRect().top > GRAB_ZONE_PX) return;
        if (scrolled(event.target)) return;

        gesture = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          offset: 0,
          dragging: false,
          abandoned: false,
          duration: sheet.style.transitionDuration,
        };
      };

      const move = (event: PointerEvent): void => {
        const current = gesture;
        if (current === null || current.pointerId !== event.pointerId || current.abandoned) return;

        const dy = event.clientY - current.y;
        if (!current.dragging) {
          const dx = event.clientX - current.x;
          if (Math.abs(dy) < DIRECTION_LOCK_PX && Math.abs(dx) < DIRECTION_LOCK_PX) return;
          // Anything but a pull straight down is the content's own business.
          if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
            current.abandoned = true;
            return;
          }
          current.dragging = true;
          // Moves the sheet on its own compositor layer rather than repainting it per frame.
          sheet.style.willChange = "transform";
          // The drag is measured from here, so the pixels the lock took do not jump.
          current.y = event.clientY;
          current.time = event.timeStamp;
          // While a finger is on it the sheet stands where the finger is rather than chasing it.
          sheet.style.transitionDuration = "0ms";
          sheet.setPointerCapture(event.pointerId);
          return;
        }

        current.offset = Math.max(0, event.clientY - current.y);
        if (frame === 0) frame = window.requestAnimationFrame(paint);
      };

      // The browser would rubber-band the list under the finger while the sheet is moving.
      const block = (event: TouchEvent): void => {
        if (gesture?.dragging === true) event.preventDefault();
      };

      const finish = (event: PointerEvent): void => {
        const current = gesture;
        gesture = null;
        if (frame !== 0) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
        if (current === null || current.pointerId !== event.pointerId || !current.dragging) return;

        // Mantine owns the transition between gestures; the drag only borrowed it.
        sheet.style.transitionDuration = current.duration;

        const elapsed = Math.max(1, event.timeStamp - current.time);
        const flicked = current.offset >= FLICK_MIN_PX && current.offset / elapsed > FLICK_VELOCITY;
        if (current.offset > sheet.clientHeight * COMMIT_RATIO || flicked) {
          // The exit transition picks the sheet up where the finger left it.
          onClose();
          return;
        }
        // The layer is worth keeping until the sheet has settled back into place.
        sheet.addEventListener("transitionend", clear, { once: true });
        sheet.style.transform = translate(0);
      };

      const clear = (): void => {
        sheet.style.willChange = "";
      };

      sheet.addEventListener("pointerdown", down);
      sheet.addEventListener("pointermove", move);
      sheet.addEventListener("pointerup", finish);
      sheet.addEventListener("pointercancel", finish);
      sheet.addEventListener("touchmove", block, { passive: false });

      return () => {
        if (frame !== 0) window.cancelAnimationFrame(frame);
        sheet.removeEventListener("transitionend", clear);
        sheet.removeEventListener("pointerdown", down);
        sheet.removeEventListener("pointermove", move);
        sheet.removeEventListener("pointerup", finish);
        sheet.removeEventListener("pointercancel", finish);
        sheet.removeEventListener("touchmove", block);
      };
    },
    [onClose],
  );
}
