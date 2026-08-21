// UI component using feature hooks.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Box, Tabs } from "@mantine/core";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CompletedRides } from "@/features/rides/CompletedRides";
import { PendingRides } from "@/features/strava/PendingRidesCard";
import { usePendingRides } from "@/features/strava/strava.queries";

type RidesTab = "completed" | "pending";

// Carousel indexes match tab order.
const TAB_ORDER: RidesTab[] = ["completed", "pending"];

// Displays confirmed and pending ride tabs.
export function Rides(): ReactElement {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pendingRides } = usePendingRides();

  // Notification-selected pending ride.
  const requestedActivityId = searchParams.get("pending") ?? undefined;
  // URL-selected tab.
  const requestedTab = searchParams.get("tab");

  const [tab, setTab] = useState<RidesTab>("completed");
  // URL parameters override local selection.
  const activeTab: RidesTab = requestedActivityId !== undefined || requestedTab === "pending" ? "pending" : tab;

  const pendingCount = pendingRides?.length ?? 0;

  // Swipeable panels stay aligned with tabs.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", duration: 20 });

  // Clear URL overrides after manual selection.
  const selectTab = useCallback(
    (next: RidesTab): void => {
      setTab(next);
      if (requestedActivityId === undefined && requestedTab === null) return;
      const params = new URLSearchParams(searchParams);
      params.delete("pending");
      params.delete("tab");
      setSearchParams(params, { replace: true });
    },
    [requestedActivityId, requestedTab, searchParams, setSearchParams],
  );

  // Sync selection after dragging.
  useEffect(() => {
    if (!emblaApi) return;
    const handleSelect = (): void => {
      selectTab(TAB_ORDER[emblaApi.selectedScrollSnap()]);
    };
    emblaApi.on("select", handleSelect);
    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi, selectTab]);

  // Sync the carousel with the selected tab.
  useEffect(() => {
    if (!emblaApi) return;
    const index = TAB_ORDER.indexOf(activeTab);
    if (emblaApi.selectedScrollSnap() === index) return;
    emblaApi.scrollTo(index, true);
  }, [emblaApi, activeTab]);

  // Recalculate carousel height after pending rides change.
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, pendingCount]);

  function clearRequestedActivity(): void {
    if (requestedActivityId === undefined && requestedTab === null) return;
    // Preserve the pending tab after clearing URL parameters.
    selectTab("pending");
  }

  return (
    <Tabs
      value={activeTab}
      onChange={(value) => selectTab(value === "pending" ? "pending" : "completed")}
      // Match the tab bar to the page theme.
      styles={{
        // Override Mantine's inactive tab border.
        root: { "--tab-border-color": "var(--color-text-900)" },
        tab: {
          borderBottomWidth: 3,
          // Disable Mantine's pressed tab tint.
          "--tab-hover-color": "transparent",
        },
      }}
      color="primary.6"
    >
      <Tabs.List grow>
        {/* Dim inactive tabs. */}
        <Tabs.Tab value="completed" c={activeTab === "completed" ? "text.6" : "text.8"}>
          {t("rides.tabRides")}
        </Tabs.Tab>
        <Tabs.Tab value="pending" c={activeTab === "pending" ? "text.6" : "text.8"}>
          {/* Include the pending ride count. */}
          {pendingCount > 0 ? `${t("rides.tabPending")} (${pendingCount})` : t("rides.tabPending")}
        </Tabs.Tab>
      </Tabs.List>

      {/* Keep panels mounted for carousel dragging. */}
      <Box className="overflow-hidden" ref={emblaRef}>
        {/* Preserve vertical scrolling during horizontal swipes. */}
        <Box className="flex items-start touch-pan-y">
          <Box className="min-w-0 shrink-0 basis-full" pt="sm">
            <CompletedRides />
          </Box>
          <Box className="min-w-0 shrink-0 basis-full" pt="sm">
            <PendingRides openActivityId={requestedActivityId} onOpenedActivityHandled={clearRequestedActivity} />
          </Box>
        </Box>
      </Box>
    </Tabs>
  );
}
