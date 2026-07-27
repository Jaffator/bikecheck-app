// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Stack, Text, Title } from "@mantine/core";
import { useBikes } from "./bikes.queries";

export function BikeList(): ReactElement {
  const { data: bikes } = useBikes();

  // if (isLoading) {
  //   return <Loader />;
  // }

  // if (error) {
  //   return <Text c="red">Failed to load bikes.</Text>;
  // }

  return (
    <>
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
      {[...Array(10)].map((_, i) => (
        <Card key={i} bg="cards.6" className="m-3 border h-100">
          <Text c="text.6">
            What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
            been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the
            librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy
            text for Letraset's Body Type sheets. It has survived not only many decades, but also the leap into electronic
            typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with
            desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.
          </Text>
        </Card>
      ))}
    </>
  );
}
