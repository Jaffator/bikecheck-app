// Service page.
import { useState, type ReactElement } from "react";
import { Box, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeFilterChips } from "@/features/service/ui/BikeFilterChips";
import { SWIPE_AREA_STYLE, useBikePanel, useBikeSwipe } from "@/features/service/useBikeSwipe";
import { ServiceList } from "@/features/service/ui/ServiceList";
import { useRecentServices } from "@/features/service/service.queries";
import { AttentionCard } from "@/features/service_tracking/ui/AttentionCard";
import { AllGoodCard } from "@/features/service_tracking/ui/AllGoodCard";
import { EmptyService } from "./EmptyService";

// Clears the FAB and the bottom nav, so the last row can still be tapped.
const FAB_CLEARANCE = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// The chips hold under the app header while the page scrolls, so a bike can be switched
// from anywhere in the list. They carry the page background: the cards pass under them.
// The offset is the app header's height - see AppLayout.
const STICKY_CHIPS_STYLE = {
  position: "sticky",
  top: "calc(3rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
  zIndex: 2,
  backgroundColor: "var(--mantine-color-background-9)",
} as const;

// Shows the maintenance history: the latest few services, with the full list one tap away.
export function Service(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  // Null reads as every bike.
  const [bikeId, setBikeId] = useState<number | null>(null);
  const { data, isLoading, isError, isPlaceholderData: listStale } = useRecentServices(bikeId ?? undefined);

  const services = data?.items ?? [];
  const hasBikes = (bikes?.length ?? 0) > 0;
  // One bike is not a choice worth offering.
  const showChips = (bikes?.length ?? 0) > 1;
  // Where the full history is: one bike's own page once a bike is chosen - or in a garage
  // of one, where the chips are not offered and the bike is clear - and the garage's
  // otherwise, with its chip to narrow it there.
  const historyBikeId = bikeId ?? (bikes?.length === 1 ? bikes[0].id : null);
  const historyRoute = historyBikeId === null ? "/service/history" : `/bikes/${String(historyBikeId)}/history`;
  // What the chosen bike - or the garage - needs doing, or the all-clear. A garage with no
  // bikes has nothing to track, so it gets neither.
  const attention = hasBikes ? <AttentionCard bikeId={bikeId} whenEmpty={<AllGoodCard />} /> : null;
  // A swipe across the content picks a bike, exactly as tapping its chip does.
  const swipeHandlers = useBikeSwipe(bikes ?? [], bikeId, setBikeId);
  // The list the previous bike left on screen dims until the new one lands, and the new one
  // arrives from the side the selection moved.
  const panel = useBikePanel(bikes ?? [], bikeId, listStale);

  // The very first load has no chips or heading to frame yet, so it takes the whole page.
  // Narrowing to a bike keeps them, and shows its loading state inside the list.
  if (isLoading && bikeId === null) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (!isError && !isLoading && services.length === 0) {
    // Nothing recorded and no bike to record on — this is the first run.
    if (!hasBikes) return <EmptyService />;

    // A bike with nothing on it may still owe work, so what it owes sits above the empty
    // state. The chips stay: they are the only way back to the bikes that do have a history.
    return (
      <Stack gap={0} pb={FAB_CLEARANCE}>
        {showChips && (
        <Box style={STICKY_CHIPS_STYLE}>
          <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={setBikeId} />
        </Box>
      )}
        {/* pan-y leaves vertical scrolling to the browser and hands the sideways gesture
            here. The bar stays outside it, so it keeps its own sideways scroll. */}
        <Box style={SWIPE_AREA_STYLE} {...swipeHandlers}>
          <Box key={panel.key} className={panel.className} style={panel.style}>
            {/* A garage of one has its bike implied, as historyBikeId does above. The card
                goes inside the empty state, so the illustration runs behind it too. */}
            <EmptyService
              forBike={bikeId !== null || bikes?.length === 1}
              forGarage
              compact
              header={<Box pt={12}>{attention}</Box>}
            />
          </Box>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap={0} pb={FAB_CLEARANCE}>
      {showChips && (
        <Box style={STICKY_CHIPS_STYLE}>
          <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={setBikeId} />
        </Box>
      )}

      {/* The bar stays outside the gesture, so it keeps its own sideways scroll. */}
      <Box style={SWIPE_AREA_STYLE} {...swipeHandlers}>
        <Box key={panel.key} className={panel.className} style={panel.style}>
          <Stack gap="sm" className="m-3">
            {attention}

            <Text fw={600} fz={15} c="text.7">
              {t("service.recentTitle")}
            </Text>

            <ServiceList
              services={services}
              isLoading={isLoading}
              isError={isError}
              footer={
                // The way out of the recent few: the last row of the card they share.
                <UnstyledButton
                  onClick={() => {
                    navigate(historyRoute);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.875rem",
                    transition: "transform 0.12s ease",
                  }}
                  className="active:scale-[0.985]"
                >
                  <Group justify="center" align="center" gap={8} wrap="nowrap">
                    <Text className="font-mono uppercase" fz={12} fw={500} c="text.6" lts="0.08em">
                      {t("service.viewAll")}
                    </Text>
                    <ArrowRight size={14} color="var(--mantine-color-text-6)" />
                  </Group>
                </UnstyledButton>
              }
            />
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
