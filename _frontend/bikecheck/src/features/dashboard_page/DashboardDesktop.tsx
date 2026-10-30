// Desktop Home: the banner, the figures, then two column stacks of cards.
import { useEffect, type ReactElement } from "react";
import { Grid, Group, Stack } from "@mantine/core";
import { GaragePanel } from "@/features/bikes/ui/GaragePanel";
import { GarageVisibilityChip } from "@/features/profile/ui/GarageVisibilityChip";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { RecentServicesPanel } from "@/features/service/ui/RecentServicesPanel";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { useHomePeriod } from "@/features/stats/useHomePeriod";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { WearForecastCard } from "@/features/stats/ui/WearForecastCard";
import { StravaSyncChip } from "@/features/strava/ui/StravaSyncChip";
import { useHeaderStore } from "@/store/store";
import { DashboardBanner } from "./DashboardBanner";
import { DashboardFigures } from "./DashboardFigures";

export function DashboardDesktop(): ReactElement {
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const { period, setPeriod } = useHomePeriod();

  // Home's chips and period switcher hang in the header beside its title - see the header store. They leave with the page.
  useEffect(() => {
    setActionSlot(
      // Wraps in reverse, so a narrow window drops the chips under the switcher, not the switcher under the chips.
      <Group gap={8} justify="flex-end" wrap="wrap-reverse">
        <Group gap={8} wrap="nowrap">
          <StravaSyncChip />
          <GarageVisibilityChip />
        </Group>
        <HomePeriodSwitcher value={period} onChange={setPeriod} />
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, period, setPeriod]);

  return (
    // The header leaves 4px under its row; 12 more makes the page's 16px gap.
    <Stack gap="md" p="xl" pt={12}>
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
