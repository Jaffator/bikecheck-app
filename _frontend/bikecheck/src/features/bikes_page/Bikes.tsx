// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useBikes } from "../bikes/bikes.queries";
import { BikeCard } from "./BikeCard";
import { EmptyGarage } from "./EmptyGarage";

export function Bikes(): ReactElement {
  const { data: bikes, isLoading, isError } = useBikes();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Card-shaped placeholders rather than a spinner: the list keeps its shape, so
  // arriving bikes fill the layout instead of replacing it.
  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        {[0, 1].map((row) => (
          <Skeleton key={row} h={300} radius="md" />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Text m="md" c="red">
        {t("bikes.loadFailed")}
      </Text>
    );
  }

  // An empty garage has no list to show — the whole screen becomes the CTA.
  if (!bikes || bikes.length === 0) {
    return <EmptyGarage />;
  }

  return (
    // Clears the tab bar and the Fab, which both sit over the bottom of the page.
    <Stack gap="md" px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      <Text fz={14} c="var(--color-text-dim)">
        {t("bikes.intro")}
      </Text>

      {bikes.map((bike) => (
        <BikeCard key={bike.id} bike={bike} onOpen={() => navigate(`/bikes/${bike.id}`)} />
      ))}
    </Stack>
  );
}
