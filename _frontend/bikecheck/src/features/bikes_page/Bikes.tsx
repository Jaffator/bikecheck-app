// Garage page.
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

  // Preserve layout while bikes load.
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

  // Show the empty state when no bikes exist.
  if (!bikes || bikes.length === 0) {
    return <EmptyGarage />;
  }

  return (
    // Reserve space for bottom navigation.
    <Stack gap="md" px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {bikes.map((bike) => (
        <BikeCard key={bike.id} bike={bike} onOpen={() => navigate(`/bikes/${bike.id}`)} />
      ))}
    </Stack>
  );
}
