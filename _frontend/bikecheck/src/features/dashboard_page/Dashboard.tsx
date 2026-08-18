// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Loader } from "@mantine/core";
import { useBikes } from "../bikes/bikes.queries";
import { EmptyDashboard } from "./EmptyDashboard";
import { StravaStatusCard } from "../strava/StravaStatusCard";

export function Dashboard(): ReactElement {
  const { data: bikes, isLoading } = useBikes();

  if (isLoading) {
    return <Loader m="md" />;
  }

  // No bikes means nothing to summarise — the whole screen becomes the CTA.
  if (!bikes || bikes.length === 0) {
    return <EmptyDashboard />;
  }

  // TODO: the populated dashboard (needs attention, last ride, quick stats).
  return (
    <>
      {/* Reports the link only — disconnecting belongs in settings. */}
      <StravaStatusCard />
    </>
  );
}
