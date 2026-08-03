// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Loader, Text } from "@mantine/core";
import { useBikes } from "../bikes/bikes.queries";
import { EmptyDashboard } from "./EmptyDashboard";

export function Dashboard(): ReactElement {
  const { data: bikes, isLoading } = useBikes();

  if (isLoading) {
    return <Loader m="md" />;
  }

  // No bikes means nothing to summarise — the whole screen becomes the CTA.
  console.log(bikes);
  if (!bikes || bikes.length === 0) {
    return <EmptyDashboard />;
  }

  // TODO: the populated dashboard (needs attention, last ride, quick stats).
  return (
    <Card bg="cards.6" className="m-3 border">
      <Text c="text.6">DASHBOARD PAGE</Text>
    </Card>
  );
}
