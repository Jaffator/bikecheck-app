// Service page.
import { useState, type ReactElement } from "react";
import { Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeFilterChips } from "@/features/service/BikeFilterChips";
import { ServiceList } from "@/features/service/ServiceList";
import { useRecentServices } from "@/features/service/service.queries";
import { EmptyService } from "./EmptyService";

// Shows the maintenance history: the latest few services, with the full list one tap away.
export function Service(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  // Null reads as every bike.
  const [bikeId, setBikeId] = useState<number | null>(null);
  const { data, isLoading, isError } = useRecentServices(bikeId ?? undefined);

  const services = data?.items ?? [];
  // One bike is not a choice worth offering.
  const showChips = (bikes?.length ?? 0) > 1;

  // The very first load has no chips or heading to frame yet, so it takes the whole page.
  // Narrowing to a bike keeps them, and shows its loading state inside the list.
  if (isLoading && bikeId === null) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  // Nothing recorded and no filter narrowing it — this is the first run.
  if (!isError && services.length === 0 && bikeId === null) {
    return <EmptyService />;
  }

  // A bike with nothing on it gets the same empty state, but keeps the chips above it:
  // they are the only way back to the bikes that do have a history.
  if (!isError && !isLoading && services.length === 0) {
    return (
      <Stack gap={0} pb="xl">
        {showChips && <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={setBikeId} />}
        <EmptyService forBike />
      </Stack>
    );
  }

  return (
    // The needs-attention section will sit above the history; nothing renders there yet.
    <Stack gap={0} pb="xl">
      {showChips && <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={setBikeId} />}

      <Stack gap="sm" className="m-3">
        <Text fw={600} fz={15} c="text.7">
          {t("service.recentTitle")}
        </Text>

        <ServiceList services={services} isLoading={isLoading} isError={isError} />

        {/* The way out of the recent few, under the list it continues. */}
        <UnstyledButton
          onClick={() => {
            // Carries the chip selection into the full list.
            navigate(bikeId === null ? "/service/history" : `/service/history?bike=${bikeId}`);
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "0.875rem",
            borderRadius: "var(--mantine-radius-lg)",
            border: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--mantine-color-cards-6)",
            transition: "transform 0.12s ease",
          }}
          className="active:scale-[0.985]"
        >
          <Group justify="center" align="center" gap={8} wrap="nowrap">
            <Text className="font-mono uppercase" fz={12} fw={500} c="text.6" lts="0.08em">
              {t("service.viewAll")}
            </Text>
            <ArrowRight size={14} color="var(--mantine-color-text-6)" />
          </Group>
        </UnstyledButton>
      </Stack>
    </Stack>
  );
}
