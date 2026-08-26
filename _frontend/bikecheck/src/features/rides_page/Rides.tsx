// UI component using feature hooks.
import { useCallback, useState, type ReactElement, type ReactNode } from "react";
import { Box, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CompletedRides } from "@/features/rides/CompletedRides";
import { PendingRides } from "@/features/strava/PendingRidesCard";
import { usePendingRides } from "@/features/strava/strava.queries";
import { SETTLE_MS, useSwipePanels } from "@/hooks/useSwipePanels";

type RidesTab = "completed" | "pending";

// Panel order, which is also the order a swipe moves through them.
const TAB_ORDER: RidesTab[] = ["completed", "pending"];

// One panel of the swipe track. The panel that is not current is not painted while the
// track is still, and is revealed the moment a finger starts to bring it in. It is hidden
// rather than unmounted or skipped, so it keeps its height: the list a user has scrolled
// is still where they left it when they swipe back to it.
function SwipePanel({ current, moving, children }: { current: boolean; moving: boolean; children: ReactNode }): ReactElement {
  return (
    <Box
      className="min-w-0 shrink-0 basis-full"
      pt="sm"
      style={{ visibility: current || moving ? "visible" : "hidden" }}
    >
      {children}
    </Box>
  );
}

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
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  const pendingCount = pendingRides?.length ?? 0;

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

  // Stable across renders, so the pending list is not re-rendered by a tab change alone.
  const clearRequestedActivity = useCallback((): void => {
    if (requestedActivityId === undefined && requestedTab === null) return;
    // Preserve the pending tab after clearing URL parameters.
    selectTab("pending");
  }, [requestedActivityId, requestedTab, selectTab]);

  // A finished swipe selects a tab, which is the same thing tapping one does.
  const selectIndex = useCallback((next: number): void => selectTab(TAB_ORDER[next]), [selectTab]);
  const swipe = useSwipePanels(activeIndex, TAB_ORDER.length, selectIndex);

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

      {/* pan-y leaves vertical scrolling to the browser and hands the sideways gesture
          here, so dragging the list up and down never drags the panels with it. */}
      <Box className="overflow-hidden" style={{ touchAction: "pan-y" }} {...swipe.handlers}>
        <Box
          className="flex items-start"
          style={{
            transform: `translate3d(calc(${-activeIndex * 100}% + ${swipe.offset}px), 0, 0)`,
            // While a finger is on the track it follows the finger; once it lifts, the
            // track covers whatever distance the swipe did not.
            transition: swipe.dragging ? "none" : `transform ${SETTLE_MS}ms ease-out`,
          }}
        >
          <SwipePanel current={activeTab === "completed"} moving={swipe.moving}>
            <CompletedRides />
          </SwipePanel>
          <SwipePanel current={activeTab === "pending"} moving={swipe.moving}>
            <PendingRides openActivityId={requestedActivityId} onOpenedActivityHandled={clearRequestedActivity} />
          </SwipePanel>
        </Box>
      </Box>
    </Tabs>
  );
}
