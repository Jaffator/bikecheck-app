// Desktop Home (#165, variant D): a context line, the banner, the figures, then tables and charts on one grid.
import { useEffect, type ReactElement } from "react";
import { Button, Grid, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { GaragePanel } from "@/features/bikes/ui/GaragePanel";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { RecentServicesPanel } from "@/features/service/ui/RecentServicesPanel";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { WearForecastCard } from "@/features/stats/ui/WearForecastCard";
import { ADD_SERVICE } from "@/layout/navItems";
import { useHeaderStore } from "@/store/store";
import { ContextLine } from "./ContextLine";
import { DashboardBanner } from "./DashboardBanner";
import { DashboardFigures } from "./DashboardFigures";

export function DashboardDesktop(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);

  // Home's one action hangs in the header beside its title - see the header store. It leaves with the page.
  useEffect(() => {
    setActionSlot(
      <Button
        color="primary.6"
        c="textDark.6"
        radius="md"
        leftSection={<Plus size={16} />}
        onClick={() => navigate(ADD_SERVICE.path)}
      >
        {t(ADD_SERVICE.labelKey)}
      </Button>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate]);

  return (
    // No top padding: the context line belongs to the header's title just above it.
    <Stack gap="md" p="md" pt={0}>
      <ContextLine />
      <DashboardBanner />
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
