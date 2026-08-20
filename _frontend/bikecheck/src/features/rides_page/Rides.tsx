// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Box, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { EmptyRides } from "./EmptyRides";
import { PendingRides } from "@/features/strava/PendingRidesCard";
import { usePendingRides } from "@/features/strava/strava.queries";

type RidesTab = "completed" | "pending";

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

  function clearRequestedActivity(): void {
    if (requestedActivityId === undefined && requestedTab === null) return;
    // Keeps the tab where the notification put it: dropping the parameter alone
    // would fall back to whatever the user last chose.
    setTab("pending");
    const next = new URLSearchParams(searchParams);
    next.delete("pending");
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }

  return (
    <Tabs
      value={activeTab}
      onChange={(value) => setTab(value === "pending" ? "pending" : "completed")}
      // The tab bar keeps to the page's own colours; Mantine's default reads as
      // a light strip on this theme.
      styles={{
        list: { borderBottomColor: "var(--color-border-subtle)" },
        tab: {
          borderBottomWidth: 2,
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

      <Tabs.Panel value="completed">
        {/* The ride list arrives with its own backend endpoint; until then this
            tab is the empty state it will replace. */}
        <EmptyRides />
      </Tabs.Panel>

      <Tabs.Panel value="pending">
        <Box pt="sm">
          <PendingRides openActivityId={requestedActivityId} onOpenedActivityHandled={clearRequestedActivity} />
        </Box>
      </Tabs.Panel>
    </Tabs>
  );
}
