// Lets a finger on the page body move through the bike filter, in the chips' own order.
import { useCallback, useState, type CSSProperties } from "react";
import type { Bike } from "@/features/bikes/bikes.types";
import { useSwipePanels } from "@/hooks/useSwipePanels";

// Spread onto the element the gesture is read from. pan-y leaves vertical scrolling to
// the browser and hands the sideways gesture to the hook; contain keeps a sideways drag
// from reaching the browser's own back-and-forward swipe. The area reaches down the
// screen even when the bike below the chips has almost no history, so the finger has
// somewhere to land - a box that ends with the content reads as a swipe that is broken.
export const SWIPE_AREA_STYLE: CSSProperties = {
  touchAction: "pan-y",
  overscrollBehaviorX: "contain",
  minHeight: "60dvh",
};

// The all-bikes chip leads the bar, so it leads the swipe order too.
const ALL_BIKES_INDEX = 0;

type SwipeHandlers = ReturnType<typeof useSwipePanels>["handlers"];

// Where a bike sits in the chips' order. A bike id that no longer matches a bike reads as
// the all-bikes chip, the same as null.
function chipIndex(bikes: Bike[], selected: number | null): number {
  return selected === null ? ALL_BIKES_INDEX : bikes.findIndex((bike) => bike.id === selected) + 1;
}

interface BikePanel {
  // Changes only once the new bike's services are on screen, so remounting it animates
  // the arriving content rather than the outgoing one.
  key: string;
  // Spread onto that panel: it carries the direction the content travels from.
  style: CSSProperties;
  className: string;
}

// How far the arriving content travels, in pixels. Enough to read as movement, little
// enough that it never looks like a page turn.
const SLIDE_PX = 16;

// Fades the content in from the side the selection moved, once it is the content of the
// bike the user picked. While the previous list is still holding its place - see the
// queries, which keep it rather than blanking the page - it only dims.
export function useBikePanel(bikes: Bike[], selected: number | null, stale: boolean): BikePanel {
  // The bike whose services are actually on screen.
  const [shown, setShown] = useState(selected);
  const [direction, setDirection] = useState(1);

  if (!stale && shown !== selected) {
    setDirection(chipIndex(bikes, selected) >= chipIndex(bikes, shown) ? 1 : -1);
    setShown(selected);
  }

  return {
    key: shown === null ? "all" : String(shown),
    className: "bike-panel-in",
    style: {
      "--bike-panel-slide": `${direction * SLIDE_PX}px`,
      opacity: stale ? 0.55 : 1,
      transition: "opacity 160ms ease-out",
    } as CSSProperties,
  };
}

// Drives the same selection the chips do, from a swipe across the content below them. Only
// the handlers are taken: the panels of the other bikes are never drawn, so the offset the
// hook measures has nothing to move and the content simply swaps - see the bike filter.
// Null when there is nothing to move through, which is also when the bar is not rendered.
export function useBikeSwipe(
  bikes: Bike[],
  selected: number | null,
  onSelect: (bikeId: number | null) => void,
): SwipeHandlers | null {
  const index = chipIndex(bikes, selected);

  const selectIndex = useCallback(
    (next: number): void => {
      if (next === ALL_BIKES_INDEX) {
        onSelect(null);
        return;
      }
      // The hook clamps at both ends, so this only guards a list that changed mid-gesture.
      const bike = bikes[next - 1];
      if (bike) onSelect(bike.id);
    },
    [bikes, onSelect],
  );

  const swipe = useSwipePanels(index, bikes.length + 1, selectIndex);

  return bikes.length > 1 ? swipe.handlers : null;
}
