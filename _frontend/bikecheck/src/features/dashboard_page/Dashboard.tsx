// Dashboard page.
import type { ReactElement } from "react";
import { Loader, Stack } from "@mantine/core";
import { useBikes } from "@/features/bikes/bikes.queries";
import { EmptyDashboard } from "./EmptyDashboard";
import { StravaStatusCard } from "@/features/strava/ui/StravaStatusCard";
import { UnpairedBikesCard } from "@/features/strava/ui/UnpairedBikesCard";
import { PendingRidesCard } from "@/features/strava/ui/PendingRidesDashCard";
import { AttentionCard } from "@/features/service_tracking/ui/AttentionCard";
const FAB_CLEARANCE = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

export function Dashboard(): ReactElement {
  const { data: bikes, isLoading } = useBikes();

  if (isLoading) {
    return <Loader m="md" />;
  }

  // Show the empty state when no bikes exist.
  if (!bikes || bikes.length === 0) {
    return <EmptyDashboard />;
  }
  // TODO: Add the populated dashboard.
  return (
    // Clears the floating create button, so the last card can be scrolled out from under
    // it. Without the room there is nothing to scroll, and the button sits on the card.
    <Stack gap="sm" p="md" pb={FAB_CLEARANCE}>
      {/* Show Strava connection status. */}
      <StravaStatusCard />
      {/* Show bikes awaiting Strava pairing. */}
      <UnpairedBikesCard />
      {/* Show rides awaiting bike assignment. */}
      <PendingRidesCard />
      {/* Show what the garage needs doing, worst first. */}
      <AttentionCard bikeId={null} />
    </Stack>
  );
}
