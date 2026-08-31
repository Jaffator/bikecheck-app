// Dashboard page.
import type { ReactElement } from "react";
import { Loader, Stack } from "@mantine/core";
import { useBikes } from "../bikes/bikes.queries";
import { EmptyDashboard } from "./EmptyDashboard";
import { StravaStatusCard } from "../strava/StravaStatusCard";
import { UnpairedBikesCard } from "../strava/UnpairedBikesCard";
import { PendingRidesCard } from "../strava/PendingRidesDashCard";
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
    <Stack gap="sm" p="md">
      {/* Show Strava connection status. */}
      <StravaStatusCard />
      {/* Show bikes awaiting Strava pairing. */}
      <UnpairedBikesCard />
      {/* Show rides awaiting bike assignment. */}
      <PendingRidesCard />
    </Stack>
  );
}
