// The forecast's chip row: a finger swipes it, a mouse steps through its chips with arrows, and the row follows the chosen one.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { Box, Group, ScrollArea, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const MOUSE_QUERY = "(hover: hover) and (pointer: fine)";
// The card's md padding: the row runs into it, the arrows line up with it.
const EDGE = 16;
const ARROW_SIZE = 30;
const CHIP_HEIGHT = 34;
// Where a chip is gone under an arrow, and where it reads whole again.
const UNDER_ARROW = EDGE + ARROW_SIZE;
const CLEAR_OF_ARROW = UNDER_ARROW + 38;
// The distance from an end over which its quiet fade arrives, so it grows with the scroll.
const EASE_IN = 40;

const ARROW_STYLE: CSSProperties = {
  position: "absolute",
  top: (CHIP_HEIGHT - ARROW_SIZE) / 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: ARROW_SIZE,
  height: ARROW_SIZE,
  borderRadius: "50%",
  border: "1px solid var(--color-border-subtle)",
  backgroundColor: "var(--color-surface-raised)",
  boxShadow: "var(--elev-row)",
  color: "var(--mantine-color-text-6)",
};

type Direction = -1 | 1;

// How far the row can still move each way: 0 at that end, 1 once well away from it.
interface RailReach {
  back: number;
  ahead: number;
}

interface ForecastChipRailProps {
  chosenKey: string;
  canStepBack: boolean;
  canStepAhead: boolean;
  onStep: (direction: Direction) => void;
  children: ReactNode;
}

export function ForecastChipRail({
  chosenKey,
  canStepBack,
  canStepAhead,
  onStep,
  children,
}: ForecastChipRailProps): ReactElement {
  const hasMouse = useMediaQuery(MOUSE_QUERY, undefined, { getInitialValueInEffect: false });
  const viewportRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [reach, syncReach] = useRailReach(viewportRef, chipsRef);
  // Chips that all fit need no arrows.
  const arrows = hasMouse && (reach.back > 0 || reach.ahead > 0);
  const arrowBack = arrows && canStepBack;
  const arrowAhead = arrows && canStepAhead;

  // A chip half behind the edge would read as nothing chosen.
  useEffect(() => {
    revealChosen(viewportRef.current, arrowBack ? CLEAR_OF_ARROW : EDGE, arrowAhead ? CLEAR_OF_ARROW : EDGE);
  }, [chosenKey, arrowBack, arrowAhead]);

  return (
    <Box pos="relative" mx={-EDGE}>
      <ScrollArea
        type="never"
        offsetScrollbars={false}
        viewportRef={viewportRef}
        onScrollPositionChange={syncReach}
        style={railMask(fadeStops(reach.back, arrowBack), fadeStops(reach.ahead, arrowAhead))}
      >
        {/* As wide as its chips, so the end padding counts and a change in their width is seen. */}
        <Group ref={chipsRef} gap={8} wrap="nowrap" px={EDGE} w="max-content">
          {children}
        </Group>
      </ScrollArea>
      {arrowBack && <RailArrow direction={-1} onStep={onStep} />}
      {arrowAhead && <RailArrow direction={1} onStep={onStep} />}
    </Box>
  );
}

function useRailReach(
  viewportRef: RefObject<HTMLDivElement | null>,
  chipsRef: RefObject<HTMLDivElement | null>,
): [RailReach, () => void] {
  const [reach, setReach] = useState<RailReach>({ back: 0, ahead: 0 });

  const sync = useCallback((): void => {
    const viewport = viewportRef.current;
    if (viewport === null) return;

    const back = easedReach(viewport.scrollLeft);
    const ahead = easedReach(viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft);
    setReach((shown) => (shown.back === back && shown.ahead === ahead ? shown : { back, ahead }));
  }, [viewportRef]);

  // A narrower card, a late font and another bike's chips all change how far the row reaches.
  useEffect(() => {
    const viewport = viewportRef.current;
    const chips = chipsRef.current;
    if (viewport === null || chips === null) return undefined;

    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    observer.observe(chips);
    return () => observer.disconnect();
  }, [viewportRef, chipsRef, sync]);

  return [reach, sync];
}

// Under a pixel counts as the end, since a zoomed page reports fractions.
function easedReach(distance: number): number {
  return distance <= 1 ? 0 : Math.min(1, distance / EASE_IN);
}

// Where one side's chips are gone and where they read whole: under its arrow, or a quiet fade at the card's edge.
function fadeStops(reach: number, hasArrow: boolean): [number, number] {
  return hasArrow ? [UNDER_ARROW, CLEAR_OF_ARROW] : [0, EDGE * reach];
}

function railMask([leftGone, leftWhole]: [number, number], [rightGone, rightWhole]: [number, number]): CSSProperties {
  const left = `transparent ${String(leftGone)}px, black ${String(leftWhole)}px`;
  const right = `black calc(100% - ${String(rightWhole)}px), transparent calc(100% - ${String(rightGone)}px)`;
  const mask = `linear-gradient(to right, ${left}, ${right})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

interface RailArrowProps {
  direction: Direction;
  onStep: (direction: Direction) => void;
}

function RailArrow({ direction, onStep }: RailArrowProps): ReactElement {
  const { t } = useTranslation();
  const back = direction < 0;
  const Icon = back ? ChevronLeft : ChevronRight;

  return (
    <UnstyledButton
      className="hover-veil"
      aria-label={t(back ? "stats.forecastPreviousAction" : "stats.forecastNextAction")}
      onClick={() => onStep(direction)}
      style={{ ...ARROW_STYLE, [back ? "left" : "right"]: EDGE }}
    >
      <Icon size={16} strokeWidth={2.4} />
    </UnstyledButton>
  );
}

// Sideways only, so a pick never scrolls the page; clears the fade and any arrow too.
function revealChosen(viewport: HTMLDivElement | null, clearLeft: number, clearRight: number): void {
  const chip = viewport?.querySelector('[aria-pressed="true"]');
  if (viewport === null || chip === null || chip === undefined) return;

  const frame = viewport.getBoundingClientRect();
  const box = chip.getBoundingClientRect();
  const pastLeft = box.left - (frame.left + clearLeft);
  const pastRight = box.right - (frame.right - clearRight);
  const shift = pastLeft < 0 ? pastLeft : Math.max(pastRight, 0);
  if (shift === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  viewport.scrollBy({ left: shift, behavior: reduced ? "auto" : "smooth" });
}
