// Desktop Home: a context line, the banner, the figures, then two column stacks of cards.
import { useEffect, type ReactElement } from "react";
import { Grid, Stack } from "@mantine/core";
import { GaragePanel } from "@/features/bikes/ui/GaragePanel";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { RecentServicesPanel } from "@/features/service/ui/RecentServicesPanel";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { useHomePeriod } from "@/features/stats/useHomePeriod";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { WearForecastCard } from "@/features/stats/ui/WearForecastCard";
import { useHeaderStore } from "@/store/store";
import { ContextLine } from "./ContextLine";
import { DashboardBanner } from "./DashboardBanner";
import { DashboardFigures } from "./DashboardFigures";

export function DashboardDesktop(): ReactElement {
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const { period, setPeriod } = useHomePeriod();

  // Home's period switcher hangs in the header beside its title - see the header store. It leaves with the page.
  useEffect(() => {
    setActionSlot(<HomePeriodSwitcher value={period} onChange={setPeriod} />);
    return () => setActionSlot(null);
  }, [setActionSlot, period, setPeriod]);

  return (
    // No top padding: the context line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <ContextLine />
      <DashboardBanner />
      <DashboardFigures period={period} />
      {/* Each column stacks its own cards, so a short card never leaves a gap under it.
          The last ride and the last services sit together on the right. */}
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <JobsPanel />
            <GaragePanel period={period} />
            <DistanceCard period={period} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <WearForecastCard />
            <LastRidePanel />
            <RecentServicesPanel />
            <SpendCard period={period} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
