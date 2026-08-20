// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Box, Tabs } from "@mantine/core";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CompletedRides } from "@/features/rides/CompletedRides";
import { PendingRides } from "@/features/strava/PendingRidesCard";
import { usePendingRides } from "@/features/strava/strava.queries";

type RidesTab = "completed" | "pending";

// Index in the carousel matches the order of the tabs, so the two can be kept
// in step by position alone.
const TAB_ORDER: RidesTab[] = ["completed", "pending"];

// Rides and the ones still missing a bike. Which tab is showing is component
// state, not navigation — back should leave this screen, not walk through the
// tabs the user tried. The one exception is a notification naming a ride: that
// arrives in the URL and has to select the tab holding it.
export function Rides(): ReactElement {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pendingRides } = usePendingRides();

  // Set by a notification: "/rides?pending=<activityId>".
  const requestedActivityId = searchParams.get("pending") ?? undefined;
  // Set by anything that only wants the tab, with no ride to open: "/rides?tab=pending".
  const requestedTab = searchParams.get("tab");

  const [tab, setTab] = useState<RidesTab>("completed");
  // The parameter wins while it is there, so a notification lands on the right
  // tab without the user having to find it.
  const activeTab: RidesTab = requestedActivityId !== undefined || requestedTab === "pending" ? "pending" : tab;

  const pendingCount = pendingRides?.length ?? 0;

  // The panels are swipeable, so the tab bar and the carousel are two views of
  // the same selection. Looping is off: swiping past the last tab should stop,
  // not wrap round to the first.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", duration: 20 });

  // Dropping the parameters is what lets the user leave the tab a notification
  // put them on — while they are in the URL they win over `tab`.
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

  // A finished drag is the user picking a tab, same as tapping one.
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

  // Follows the tab bar and the URL alike. Jumps without animating, because the
  // slide is already where the drag left it whenever a drag caused the change.
  useEffect(() => {
    if (!emblaApi) return;
    const index = TAB_ORDER.indexOf(activeTab);
    if (emblaApi.selectedScrollSnap() === index) return;
    emblaApi.scrollTo(index, true);
  }, [emblaApi, activeTab]);

  // The panels swap height as the user swipes between them, and embla measures
  // once on mount — without this the container keeps the first tab's height.
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, pendingCount]);

  function clearRequestedActivity(): void {
    if (requestedActivityId === undefined && requestedTab === null) return;
    // Keeps the tab where the notification put it: dropping the parameter alone
    // would fall back to whatever the user last chose.
    selectTab("pending");
  }

  return (
    <Tabs
      value={activeTab}
      onChange={(value) => selectTab(value === "pending" ? "pending" : "completed")}
      // The tab bar keeps to the page's own colours; Mantine's default reads as
      // a light strip on this theme.
      styles={{
        // The resting line under the bar is drawn by the list's ::before, and it
        // reads Mantine's own variable — which is declared on the root, so that
        // is where the override has to sit. The active tab paints its border
        // from `--tabs-color` instead, so the two never fight.
        root: { "--tab-border-color": "var(--color-text-900)" },
        tab: {
          borderBottomWidth: 3,
          // Mantine tints the tab while it is pressed. On this theme that
          // flashes a pale block behind the label, so the tint is dropped and
          // the underline is left to say which tab won.
          "--tab-hover-color": "transparent",
        },
      }}
      color="primary.6"
    >
      <Tabs.List grow>
        {/* An unselected tab sits back rather than competing with the one in
            front. Coloured per tab because inline styles carry no selectors:
            one flat colour on `tab` would dim the selected one along with it. */}
        <Tabs.Tab value="completed" c={activeTab === "completed" ? "text.6" : "text.8"}>
          {t("rides.tabRides")}
        </Tabs.Tab>
        <Tabs.Tab value="pending" c={activeTab === "pending" ? "text.6" : "text.8"}>
          {/* The count is the reason to look at this tab at all, so it sits in
              the label rather than waiting inside. */}
          {pendingCount > 0 ? `${t("rides.tabPending")} (${pendingCount})` : t("rides.tabPending")}
        </Tabs.Tab>
      </Tabs.List>

      {/* Both panels are mounted at once: embla lays the slides side by side so
          the neighbouring tab is already on screen while the finger drags it in.
          Mantine's Tabs.Panel would unmount the inactive one and leave nothing
          to drag towards, so the carousel — not Tabs — decides what shows. */}
      <Box className="overflow-hidden" ref={emblaRef}>
        {/* touch-action keeps vertical scrolling with the page; embla only
            claims the horizontal axis. */}
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
