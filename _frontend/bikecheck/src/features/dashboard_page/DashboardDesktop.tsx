// Desktop Home: a context line, the banner, the figures, then work and context as two column stacks, then the charts.
import { useCallback, useEffect, type ReactElement } from "react";
import { Grid, Stack } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { GaragePanel } from "@/features/bikes/ui/GaragePanel";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { RecentServicesPanel } from "@/features/service/ui/RecentServicesPanel";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { parseHomePeriod } from "@/features/stats/homePeriod";
import type { HomePeriod } from "@/features/stats/stats.types";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { useHeaderStore } from "@/store/store";
import { ContextLine } from "./ContextLine";
import { DashboardBanner } from "./DashboardBanner";
import { DashboardFigures } from "./DashboardFigures";

export function DashboardDesktop(): ReactElement {
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [searchParams, setSearchParams] = useSearchParams();
  // In the address, so a reload or Back keeps it; the year is the default and is not written.
  const period = parseHomePeriod(searchParams.get("period"));

  // Replaced rather than pushed, so Back leaves Home instead of stepping through the switcher.
  const changePeriod = useCallback(
    (next: HomePeriod): void => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === "year") params.delete("period");
          else params.set("period", next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Home's period switcher hangs in the header beside its title - see the header store. It leaves with the page.
  useEffect(() => {
    setActionSlot(<HomePeriodSwitcher value={period} onChange={changePeriod} />);
    return () => setActionSlot(null);
  }, [setActionSlot, period, changePeriod]);

  return (
    // No top padding: the context line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <ContextLine />
      <DashboardBanner />
      <DashboardFigures period={period} />
      {/* Each column stacks its own cards, so a short card is never stretched to its neighbour's height. */}
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <JobsPanel />
            <GaragePanel period={period} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <LastRidePanel />
            <RecentServicesPanel />
          </Stack>
        </Grid.Col>
      </Grid>
      <Grid gap="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <DistanceCard period={period} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SpendCard period={period} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
