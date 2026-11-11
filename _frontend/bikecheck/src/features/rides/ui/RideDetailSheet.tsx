// The one ride drawer: a ride or an Unassigned Ride, a bottom sheet on the phone, two columns on desktop.
// Locked on the walk through new rides, it moves from ride to ride instead of closing.
import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode, type RefObject } from "react";
import { Box, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RideMap } from "@/components/RideMap";
import { useBikes } from "@/features/bikes/bikes.queries";
import {
  rideFiguresOf,
  rideItemKey,
  routeOf,
  woreOffShown,
  type RideItem,
  type RideWalk,
} from "@/features/rides/rideDetail";
import type { CheckInStatus } from "@/features/rides/rides.types";
import {
  useRideCheckIn,
  useRidePick,
  type RideCheckInState,
  type RidePickState,
} from "@/features/rides/useRideCheckIn";
import { useIsDesktop } from "@/layout/breakpoints";
import { CheckInBikeField } from "./CheckInBikeField";
import { RideCheckInFields } from "./RideCheckInFields";
import { RideDetailActions, RideWalkActions } from "./RideDetailActions";
import { RideDetailHeader } from "./RideDetailHeader";
import { RideFigureGrid } from "./RideFigureGrid";
import { WoreOffCard } from "./WoreOffCard";

// Same layer as every other sheet: Mantine gives the FAB's Affix and a drawer one z-index.
const SHEET_Z_INDEX = 300;
// The walk stands over the page's own sheets, which sit up to 320.
const WALK_Z_INDEX = 330;
// The next ride slides in from the side the walk moves to.
const NEXT_RIDE_CLASS = "bike-panel-in";

const MAP_HEIGHT_PHONE = 230;
const MAP_HEIGHT_DESKTOP = 340;
// Mantine keeps a smaller window's modal inside its margins.
const MODAL_WIDTH = 960;
const MODAL_PADDING = 24;
const SECTION_GAP = 20;

// Nearly full height: the map, the figures and the check-in all want room.
const PHONE_STYLES: Record<string, CSSProperties> = {
  content: { height: "92dvh", display: "flex", flexDirection: "column" },
  body: { flex: 1, display: "flex", flexDirection: "column" },
  // On top of Mantine's 16px header padding, the same gap as between the sections.
  header: { marginBottom: SECTION_GAP - 16 },
  title: { flex: 1, minWidth: 0 },
};

// The columns and the footer's hairline run to the modal's edges.
const DESKTOP_STYLES: Record<string, CSSProperties> = {
  header: { padding: MODAL_PADDING, paddingBottom: 16 },
  body: { padding: 0 },
  title: { flex: 1, minWidth: 0 },
};

const COLUMNS_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  // Both columns as tall as the taller, so their last cards end on one line.
  alignItems: "stretch",
  gap: MODAL_PADDING,
};

// The rest stays put at the top; only a column's last card drops to its bottom.
const PUSHED_DOWN: CSSProperties = { marginTop: "auto" };

interface RideDetailSheetProps {
  // Null closes the sheet.
  item: RideItem | null;
  onClose: () => void;
  // Opens the check-in with this answer picked.
  checkInStartWith?: CheckInStatus;
  // Locks the sheet: no ✕, swipe, click outside or Esc. Kept while it closes, so it slides out locked.
  walk?: RideWalk;
}

export function RideDetailSheet({ item, onClose, checkInStartWith, walk }: RideDetailSheetProps): ReactElement {
  const isDesktop = useIsDesktop();
  const locked = walk !== undefined;
  const picked = useRidePick(item);
  // The first ride arrives with the sheet; each next one slides in.
  const enter = walk !== undefined && walk.position > 0 ? NEXT_RIDE_CLASS : undefined;

  return (
    <ResponsiveSheet
      opened={item !== null}
      onClose={onClose}
      desktop="modal"
      modalSize={MODAL_WIDTH}
      withCloseButton={!locked}
      dismissible={!locked}
      zIndex={locked ? WALK_Z_INDEX : SHEET_Z_INDEX}
      title={
        item === null ? undefined : (
          <Box key={rideItemKey(item)} className={enter}>
            <RideDetailHeader item={item} pick={picked.pick} walk={walk} />
          </Box>
        )
      }
      styles={isDesktop ? DESKTOP_STYLES : PHONE_STYLES}
    >
      {item !== null && (
        <Box key={rideItemKey(item)} className={enter}>
          <RideDetailBody item={item} picked={picked} startWith={checkInStartWith} onClose={onClose} walk={walk} />
        </Box>
      )}
    </ResponsiveSheet>
  );
}

interface RideDetailBodyProps {
  item: RideItem;
  picked: RidePickState;
  startWith?: CheckInStatus;
  onClose: () => void;
  walk?: RideWalk;
}

// Keyed per ride, so an answer half given on one never carries over to the next.
function RideDetailBody({ item, picked, startWith, onClose, walk }: RideDetailBodyProps): ReactElement {
  const isDesktop = useIsDesktop();
  const top = useScrolledToTop();
  const checkIn = useRideCheckIn({ item, picked, onSaved: walk?.onNext ?? onClose, startWith });
  const woreOff = <WoreOffCard lines={woreOffShown(item, checkIn.pick, walk)} />;
  // Desktop has the room for the wear under the figures, beside the check-in.
  const overview = (
    <RideOverview item={item} mapHeight={isDesktop ? MAP_HEIGHT_DESKTOP : MAP_HEIGHT_PHONE}>
      {isDesktop && <Box style={PUSHED_DOWN}>{woreOff}</Box>}
    </RideOverview>
  );
  const answers = <RideAnswers item={item} checkIn={checkIn} woreOff={isDesktop ? null : woreOff} />;
  const actions =
    walk === undefined ? (
      <RideDetailActions item={item} checkIn={checkIn} onClose={onClose} />
    ) : (
      <RideWalkActions checkIn={checkIn} onSkip={walk.onNext} />
    );

  return isDesktop ? (
    <Box ref={top}>
      <DesktopLayout overview={overview} answers={answers} actions={actions} />
    </Box>
  ) : (
    <Stack ref={top} gap={SECTION_GAP}>
      {overview}
      {answers}
      {actions}
    </Stack>
  );
}

// The sheet keeps its scroll when the walk swaps the ride under it, so each ride starts at its top.
function useScrolledToTop(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerOf(ref.current)?.scrollTo({ top: 0 });
  }, []);

  return ref;
}

// The sheet's body on the phone, the modal's content on desktop.
function scrollerOf(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null;
  while (node !== null && !["auto", "scroll"].includes(getComputedStyle(node).overflowY)) node = node.parentElement;
  return node;
}

interface LayoutProps {
  overview: ReactNode;
  answers: ReactNode;
  actions: ReactNode;
}

function DesktopLayout({ overview, answers, actions }: LayoutProps): ReactElement {
  return (
    <>
      <Box px={MODAL_PADDING} pb={MODAL_PADDING} style={COLUMNS_STYLE}>
        {overview}
        {answers}
      </Box>
      <Box px={MODAL_PADDING} py={14} style={{ borderTop: PANEL_HAIRLINE }}>
        {actions}
      </Box>
    </>
  );
}

interface RideOverviewProps {
  item: RideItem;
  mapHeight: number;
  children?: ReactNode;
}

function RideOverview({ item, mapHeight, children }: RideOverviewProps): ReactElement {
  const isDesktop = useIsDesktop();

  return (
    <Stack gap={SECTION_GAP}>
      {/* Static on the phone, so a drag on it never fights the sheet's own. */}
      <RideMap polyline={routeOf(item)} height={mapHeight} interactive={isDesktop} />
      <RideFigureGrid figures={rideFiguresOf(item)} />
      {children}
    </Stack>
  );
}

interface RideAnswersProps {
  item: RideItem;
  checkIn: RideCheckInState;
  woreOff: ReactNode;
}

// The bike, how it rode and what it wore off.
function RideAnswers({ item, checkIn, woreOff }: RideAnswersProps): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const [pickerOpened, setPickerOpened] = useState(false);
  const pickedId = checkIn.pick?.kind === "bike" ? checkIn.pick.bikeId : null;
  const notMine = checkIn.pick?.kind === "notMine";

  return (
    <Stack gap={SECTION_GAP}>
      <CheckInBikeField
        bikes={bikes ?? []}
        picked={bikes?.find((bike) => bike.id === pickedId) ?? null}
        notMine={notMine}
        missing={checkIn.pick === null}
        fallbackName={item.kind === "ride" ? (item.ride.bike_name ?? t("rides.unknownBike")) : ""}
        onPick={checkIn.setPick}
        pickerOpened={pickerOpened}
        onPickerOpenedChange={setPickerOpened}
      />

      {/* A ride that was not the rider's leaves, so it has nothing to rate. Out of reach under the bike list. */}
      {!notMine && (
        <Box inert={pickerOpened} style={{ opacity: pickerOpened ? 0.4 : 1, transition: "opacity 150ms ease" }}>
          <RideCheckInFields draft={checkIn.draft} onChange={checkIn.setDraft} />
        </Box>
      )}

      {woreOff}
    </Stack>
  );
}
