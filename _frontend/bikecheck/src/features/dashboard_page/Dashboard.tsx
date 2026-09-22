// Dashboard page.
import type { ReactElement } from "react";
import { Loader, SimpleGrid, Stack } from "@mantine/core";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { EmptyDashboard } from "./EmptyDashboard";
import { StatusRow } from "./StatusRow";
import { StravaStatusCard } from "@/features/strava/ui/StravaStatusCard";
import { AttentionCard } from "@/features/service_tracking/ui/AttentionCard";
import { AllGoodCard } from "@/features/service_tracking/ui/AllGoodCard";
const FAB_CLEARANCE = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

export function Dashboard(): ReactElement {
  const { data: bikes, isLoading } = useBikes();
  const { data: user } = useCurrentUser();

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

  return (
    // Clears the floating create button, so the last card can be scrolled out from under
    // it. Without the room there is nothing to scroll, and the button sits on the card.
    <Stack gap="md" p="md" pb={FAB_CLEARANCE}>
      {/* A phone stacks them; a browser column sits the state beside the work. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ alignItems: "start" }}>
        <Stack gap="md">
          {!stravaConnected && <StravaStatusCard />}
          <AttentionCard bikeId={null} whenEmpty={<AllGoodCard />} />
        </Stack>
        <StatusRow />
      </SimpleGrid>
    </Stack>
  );
}
