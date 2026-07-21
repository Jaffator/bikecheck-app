// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Loader, Stack, Text, Title } from "@mantine/core";
import { useBikes } from "./bikes.queries";

export function BikeList(): ReactElement {
  const { data: bikes, isLoading, error } = useBikes();

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <Text c="red">Failed to load bikes.</Text>;
  }

  return (
    <Stack>
      {bikes?.map((bike) => (
        <Card key={bike.id} withBorder>
          <Title order={4}>{bike.bikename ?? bike.bike_model ?? bike.bike_brand}</Title>
          <Text size="sm" c="dimmed">
            {bike.bike_brand} · {bike.total_km ?? 0} km
          </Text>
        </Card>
      ))}
    </Stack>
  );
}
