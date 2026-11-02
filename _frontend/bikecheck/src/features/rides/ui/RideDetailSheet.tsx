// The one ride drawer: a ride or an Unassigned Ride, a bottom sheet on the phone, two columns on desktop.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RideMap } from "@/components/RideMap";
import { useBikes } from "@/features/bikes/bikes.queries";
import { rideFiguresOf, rideItemKey, type RideItem } from "@/features/rides/rideDetail";
import type { CheckInStatus } from "@/features/rides/rides.types";
import { useRideCheckIn, type RideCheckInState } from "@/features/rides/useRideCheckIn";
import { useIsDesktop } from "@/layout/breakpoints";
import { CheckInBikeField } from "./CheckInBikeField";
import { RideAiSummary } from "./RideAiSummary";
import { RideCheckInFields } from "./RideCheckInFields";
import { RideDetailActions } from "./RideDetailActions";
import { RideDetailHeader } from "./RideDetailHeader";
import { RideFigureGrid } from "./RideFigureGrid";
import { WoreOffCard } from "./WoreOffCard";

// Same layer as every other sheet: Mantine gives the FAB's Affix and a drawer one z-index.
const SHEET_Z_INDEX = 300;

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
  alignItems: "start",
  gap: MODAL_PADDING,
};

interface RideDetailSheetProps {
  // Null closes the sheet.
  item: RideItem | null;
  onClose: () => void;
  // Opens the check-in with this answer picked.
  checkInStartWith?: CheckInStatus;
}

export function RideDetailSheet({ item, onClose, checkInStartWith }: RideDetailSheetProps): ReactElement {
  const isDesktop = useIsDesktop();

  return (
    <ResponsiveSheet
      opened={item !== null}
      onClose={onClose}
      desktop="modal"
      modalSize={MODAL_WIDTH}
      zIndex={SHEET_Z_INDEX}
      title={item === null ? undefined : <RideDetailHeader item={item} />}
      styles={isDesktop ? DESKTOP_STYLES : PHONE_STYLES}
    >
      {item !== null && (
        <RideDetailBody key={rideItemKey(item)} item={item} startWith={checkInStartWith} onClose={onClose} />
      )}
    </ResponsiveSheet>
  );
}

interface RideDetailBodyProps {
  item: RideItem;
  startWith?: CheckInStatus;
  onClose: () => void;
}

// Keyed per ride, so an answer half given on one never carries over to the next.
function RideDetailBody({ item, startWith, onClose }: RideDetailBodyProps): ReactElement {
  const isDesktop = useIsDesktop();
  const checkIn = useRideCheckIn(item, onClose, startWith);
  const overview = <RideOverview item={item} mapHeight={isDesktop ? MAP_HEIGHT_DESKTOP : MAP_HEIGHT_PHONE} />;
  const answers = <RideAnswers item={item} checkIn={checkIn} />;
  const actions = <RideDetailActions item={item} checkIn={checkIn} onClose={onClose} />;

  return isDesktop ? (
    <DesktopLayout overview={overview} answers={answers} actions={actions} />
  ) : (
    <Stack gap={SECTION_GAP}>
      {overview}
      {answers}
      {actions}
    </Stack>
  );
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

function RideOverview({ item, mapHeight }: { item: RideItem; mapHeight: number }): ReactElement {
  const isDesktop = useIsDesktop();

  return (
    <Stack gap={SECTION_GAP}>
      {/* Static on the phone, so a drag on it never fights the sheet's own. */}
      <RideMap polyline={item.ride.summary_polyline} height={mapHeight} interactive={isDesktop} />
      <RideFigureGrid figures={rideFiguresOf(item)} />
    </Stack>
  );
}

// The bike, how it rode, what it wore off and the AI review, which an Unassigned Ride has none of yet.
function RideAnswers({ item, checkIn }: { item: RideItem; checkIn: RideCheckInState }): ReactElement {
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

      {item.kind === "ride" && <WoreOffCard lines={item.ride.wore_off} />}
      {item.kind === "ride" && <RideAiSummary rideId={item.ride.id} />}
    </Stack>
  );
}
