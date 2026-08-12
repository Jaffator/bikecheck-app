// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Loader, Text } from "@mantine/core";
import { useBikes } from "../bikes/bikes.queries";
import { EmptyGarage } from "./EmptyGarage";

export function Bikes(): ReactElement {
  const { data: bikes, isLoading } = useBikes();

  if (isLoading) {
    return <Loader m="md" />;
  }

  // An empty garage has no list to show — the whole screen becomes the CTA.
  if (!bikes || bikes.length === 0) {
    return <EmptyGarage />;
  }

  // TODO: the bike list (bento grid with mileage and component health).
  return (
    <Card bg="cards.6" className="m-3 border">
      <Text c="text.6">BIKES PAGE</Text>
    </Card>
  );
}
