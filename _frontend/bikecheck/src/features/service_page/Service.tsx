// Service page.
import { useState, type ReactElement } from "react";
import { Anchor, Group, Loader, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tapFeedback } from "@/utils/haptics";
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

  return (
    // The needs-attention section will sit above the history; nothing renders there yet.
    <Stack gap={0} pb="xl">
      {showChips && <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={setBikeId} />}

      <Stack gap="sm" className="m-3">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={600} fz={15} c="text.6">
            {t("service.recentTitle")}
          </Text>
          <Anchor
            component="button"
            type="button"
            fz={13}
            c="primary.5"
            onClick={() => {
              void tapFeedback();
              // Carries the chip selection into the full list.
              navigate(bikeId === null ? "/service/history" : `/service/history?bike=${bikeId}`);
            }}
          >
            {t("service.viewAll")}
          </Anchor>
        </Group>

        <ServiceList services={services} isLoading={isLoading} isError={isError} />
      </Stack>
    </Stack>
  );
}
