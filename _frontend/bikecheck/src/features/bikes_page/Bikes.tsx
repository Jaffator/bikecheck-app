// Garage page.
import { useState, type ReactElement } from "react";
import { Group, SimpleGrid, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useArchivedBikes, useBikes } from "@/features/bikes/bikes.queries";
import { BikeCard } from "@/features/bikes/ui/BikeCard";
import { BikeArchiveDrawer } from "@/features/bikes/ui/BikeArchiveDrawer";
import { EmptyGarage } from "./EmptyGarage";

export function Bikes(): ReactElement {
  const { data: bikes, isLoading, isError } = useBikes();
  const { data: archived } = useArchivedBikes();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // The archive opens over the garage: it is the garage's own back room (ADR 0024).
  const [archive, setArchive] = useState(false);
  const archivedCount = archived?.length ?? 0;

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
    return (
      <>
        <EmptyGarage archivedCount={archivedCount} onOpenArchive={() => setArchive(true)} />
        <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />
      </>
    );
  }

  return (
    // Reserve space for bottom navigation.
    <Stack gap="md" px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {/* One to a row on a phone; two once the column is wide enough for a card each. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {bikes.map((bike) => (
          <BikeCard key={bike.id} bike={bike} onOpen={() => navigate(`/bikes/${bike.id}`)} />
        ))}
      </SimpleGrid>

      {/* The way into the archive, under the bikes in use - and only while there is
          something in it, so an owner who never put a bike away never sees the door. */}
      {archivedCount > 0 && (
        <UnstyledButton onClick={() => setArchive(true)} px="md" py="sm" className="active:scale-[0.985]">
          <Group justify="space-between" wrap="nowrap">
            <Text className="font-mono uppercase" fz={12} fw={500} c="var(--color-text-dim)" lts="0.08em">
              {t("bikes.archivedBikes", { count: archivedCount })}
            </Text>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </UnstyledButton>
      )}

      <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />
    </Stack>
  );
}
