// PROTOTYPE: the multi-bike pairing sheet on fake data, to look at it without a Strava account.
import { useState, type ReactElement } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GearLinkingSheet } from "../ui/GearLinkingSheet";
import { MultiGearSheet } from "../ui/MultiGearSheet";
import type { GearLinkingData } from "../strava.types";

const MOCK_GEAR_LINKING: GearLinkingData = {
  user_id: 1,
  athlete_id: 1,
  strava_bikes: [
    { id: "b1000001", name: "Canyon enduro" },
    { id: "b1000002", name: "Silnička" },
    { id: "b1000003", name: "Gravel" },
    { id: "b1000004", name: "Old Rockhopper" },
    { id: "b1000005", name: "Commuter" },
  ],
  bikecheck_bikes: [
    {
      id: 101,
      strava_gear_id: null,
      bikename: null,
      bike_brand: "Canyon",
      bike_model: "Spectral CF 8",
      year: 2023,
    },
    {
      id: 102,
      strava_gear_id: null,
      bikename: null,
      bike_brand: "Specialized",
      bike_model: "S-Works Tarmac SL8 Shimano Dura-Ace Di2",
      year: 2024,
    },
    {
      id: 103,
      strava_gear_id: null,
      bikename: null,
      bike_brand: "Cannondale",
      bike_model: "Topstone Carbon 2 Lefty",
      year: 2022,
    },
    {
      id: 104,
      strava_gear_id: null,
      bikename: null,
      bike_brand: "Specialized",
      bike_model: "Rockhopper",
      year: 2015,
    },
    // Already paired: its gear shows as taken in the other rows.
    {
      id: 105,
      strava_gear_id: "b1000005",
      bikename: null,
      bike_brand: "Trek",
      bike_model: "FX 3",
      year: 2021,
    },
  ],
};

// Seeded and never refetched, so the sheet reads the fake data instead of the API.
function createMockClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["gearLinking"], MOCK_GEAR_LINKING);
  return client;
}

export function GearLinkingMockPage(): ReactElement {
  const [client] = useState(createMockClient);
  const [multiOpened, setMultiOpened] = useState(true);
  const [tableOpened, setTableOpened] = useState(false);

  return (
    <QueryClientProvider client={client}>
      <Stack p="md" gap="sm" align="flex-start">
        <Text c="text.7" size="sm">
          Mock: pairing sheets for all unpaired bikes. The new sheet only closes
          on Pair; the old table hits the API.
        </Text>
        <Group gap="sm">
          <Button c="textDark.6" onClick={() => setMultiOpened(true)}>
            New sheet
          </Button>
          <Button variant="outline" onClick={() => setTableOpened(true)}>
            Old table
          </Button>
        </Group>
      </Stack>
      <MultiGearSheet
        opened={multiOpened}
        onClose={() => setMultiOpened(false)}
        onPair={() => setMultiOpened(false)}
      />
      <GearLinkingSheet
        opened={tableOpened}
        onClose={() => setTableOpened(false)}
      />
    </QueryClientProvider>
  );
}
