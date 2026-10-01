// Desktop rides: Strava status under the title, sync in the header, then Přiřazené / Nepřiřazené tabs without swipe.
import { useCallback, useEffect, type ReactElement } from "react";
import { Box, Group, Stack, Tabs, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useRides } from "@/features/rides/rides.queries";
import { AssignedRidesTable } from "@/features/rides/ui/AssignedRidesTable";
import { RideFilterBar } from "@/features/rides/ui/RideFilterBar";
import { usePendingRides } from "@/features/strava/strava.queries";
import { PendingRidesTable } from "@/features/strava/ui/PendingRidesTable";
import { StravaSyncStatus } from "@/features/strava/ui/StravaSyncStatus";
import { SyncStravaButton } from "@/features/strava/ui/SyncStravaButton";
import { useHeaderStore } from "@/store/store";

type RidesTab = "completed" | "pending";

export function RidesDesktop(): ReactElement {
  const { t } = useTranslation();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rides } = useRides();
  const { data: pending } = usePendingRides();

  // Same address as the phone's tabs, so notifications and Home's banner land on the right tab.
  const requestedActivityId = searchParams.get("pending") ?? undefined;
  const requestedRideId = searchParams.get("ride") ?? undefined;
  const requestedTab = searchParams.get("tab");
  // An explicit tab wins, so `?pending=` can stay in the URL while Přiřazené is open.
  const tab: RidesTab =
    requestedTab === "completed" || requestedTab === "pending"
      ? requestedTab
      : requestedRideId === undefined && requestedActivityId !== undefined
        ? "pending"
        : "completed";

  const assignedCount = rides?.pages[0]?.total;
  const pendingCount = pending?.length ?? 0;

  // Replaced rather than pushed, so Back leaves the page instead of stepping through tabs.
  const selectTab = useCallback(
    (next: RidesTab): void => {
      // Keeps `?pending=`, so its row is still highlighted after a visit to the other tab.
      const params: Record<string, string> = requestedActivityId === undefined ? {} : { pending: requestedActivityId };
      if (next === "pending" || requestedActivityId !== undefined) params.tab = next;
      setSearchParams(params, { replace: true });
    },
    [requestedActivityId, setSearchParams],
  );

  // Drops `?ride=` once its sheet closes, so it does not open again.
  const clearRequestedRide = useCallback((): void => {
    if (requestedRideId !== undefined) selectTab("completed");
  }, [requestedRideId, selectTab]);

  // The sync hangs in the header beside the title - see the header store.
  useEffect(() => {
    setActionSlot(<SyncStravaButton />);
    return () => setActionSlot(null);
  }, [setActionSlot]);

  return (
    // No top padding: the status line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <Group fz={13} c="var(--color-text-dim)" className="tabular-nums">
        <StravaSyncStatus withConnect />
      </Group>

      <Tabs
        value={tab}
        onChange={(value) => selectTab(value === "pending" ? "pending" : "completed")}
        color="primary.6"
        styles={{
          root: { "--tab-border-color": "var(--color-border-subtle)" },
          tab: { borderBottomWidth: 2, "--tab-hover-color": "transparent" },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="completed" c={tab === "completed" ? "text.6" : "text.8"}>
            <Group gap={6} wrap="nowrap">
              <span>{t("rides.tabAssigned")}</span>
              {assignedCount !== undefined && (
                <Text span className="tabular-nums" fz="inherit" c="var(--color-text-dim)">
                  {assignedCount}
                </Text>
              )}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="pending" c={tab === "pending" ? "text.6" : "text.8"}>
            <Group gap={6} wrap="nowrap">
              <span>{t("rides.tabPending")}</span>
              {pendingCount > 0 && <PendingPill count={pendingCount} />}
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Box pt="md">
          {/* The filter narrows Přiřazené only, so it opens that tab. */}
          {tab === "completed" ? (
            <Stack gap="md">
              <RideFilterBar />
              <AssignedRidesTable openActivityId={requestedRideId} onOpenedActivityHandled={clearRequestedRide} />
            </Stack>
          ) : (
            <PendingRidesTable highlightedActivityId={requestedActivityId} />
          )}
        </Box>
      </Tabs>
    </Stack>
  );
}

// Strava's orange: every ride in it came from Strava without a bike.
function PendingPill({ count }: { count: number }): ReactElement {
  return (
    <Box
      px={6}
      h={18}
      style={{
        borderRadius: 9999,
        backgroundColor: "var(--mantine-color-strava-6)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Text className="tabular-nums" fz={11} fw={700} c="textDark.6" lh={1}>
        {count}
      </Text>
    </Box>
  );
}
