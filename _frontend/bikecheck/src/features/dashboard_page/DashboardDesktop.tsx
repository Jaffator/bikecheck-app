// Desktop Home (#165, variant D): a status line, the figures, then tables and charts on one grid.
import type { ReactElement } from "react";
import { Grid, Stack } from "@mantine/core";
import { GaragePanel } from "@/features/bikes/ui/GaragePanel";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { RecentServicesPanel } from "@/features/service/ui/RecentServicesPanel";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { WearForecastCard } from "@/features/stats/ui/WearForecastCard";
import { DashboardFigures } from "./DashboardFigures";
import { StatusLine } from "./StatusLine";

export function DashboardDesktop(): ReactElement {
  return (
    <Stack gap="md" p="md">
      <StatusLine />
      <DashboardFigures />
      <Grid gap="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <JobsPanel />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <LastRidePanel />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <GaragePanel />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <RecentServicesPanel />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <WearForecastCard />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <DistanceCard />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SpendCard />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
