// Dashboard page.
import type { ReactElement } from "react";
import { Loader, Stack } from "@mantine/core";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { EmptyDashboard } from "./EmptyDashboard";
import { ContextLine } from "./ContextLine";
import { StravaStatusCard } from "@/features/strava/ui/StravaStatusCard";
import { AttentionCard } from "@/features/service_tracking/ui/AttentionCard";
import { AllGoodCard } from "@/features/service_tracking/ui/AllGoodCard";
import { BikeHealthList } from "@/features/bikes/ui/BikeHealthList";
import { SpendCard } from "@/features/stats/ui/SpendCard";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import { WearForecastCard } from "@/features/stats/ui/WearForecastCard";
import { useHomePeriod } from "@/features/stats/useHomePeriod";
import { LastRidePanel } from "@/features/rides/ui/LastRidePanel";
import { useIsDesktop } from "@/layout/breakpoints";
import { DashboardDesktop } from "./DashboardDesktop";
import { DashboardBannerPhone } from "./DashboardBanner";
import { DashboardFigures } from "./DashboardFigures";
const FAB_CLEARANCE = {
  base: "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
  md: "md",
};

export function Dashboard(): ReactElement {
  const { data: bikes, isLoading } = useBikes();
  const { data: user } = useCurrentUser();
  const isDesktop = useIsDesktop();
  const { period, setPeriod } = useHomePeriod();

  if (isLoading) {
    return <Loader m="md" />;
  }

  // Show the empty state when no bikes exist. Nothing to share yet, so no sharing card here.
  if (!bikes || bikes.length === 0) {
    return <EmptyDashboard />;
  }

  // The work the garage owes, then its standing state. An account not yet
  // on Strava sees the pitch where the work would be: for it, connecting is the work.
  const stravaConnected = Boolean(user?.strava_athlete_id);

  // Desktop has its own layout (#165, variant D); the phone keeps the render below.
  if (isDesktop) return <DashboardDesktop />;

  return (
    // Clears the floating create button, so the last card can be scrolled out from under
    // it; desktop has no FAB, so no room. No `p` here: its inline padding beats the responsive `pb` class.
    <Stack gap="md" px="md" pt="md" pb={FAB_CLEARANCE}>
      <ContextLine withDate={false} />
      {!stravaConnected && <StravaStatusCard />}
      <DashboardBannerPhone />
      <HomePeriodSwitcher value={period} onChange={setPeriod} fullWidth />
      <DashboardFigures period={period} />
      <LastRidePanel />
      <AttentionCard bikeId={null} whenEmpty={<AllGoodCard />} />
      <WearForecastCard />
      {/* Under the work: how the garage stands, and the way into any one bike. */}
      <BikeHealthList />
      <DistanceCard period={period} />
      <SpendCard period={period} />
    </Stack>
  );
}
