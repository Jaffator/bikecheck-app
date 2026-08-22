// UI component using feature hooks.
import type { ReactElement } from "react";
import { Center, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Bike, Receipt, Wrench } from "lucide-react";
import dayjs from "dayjs";
import { HistoryCard, HistoryMetric } from "@/components/HistoryCard";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import type { ServiceHistoryItem } from "./service.types";

// Matches the route map the ride cards lead with, so the two lists line up.
const LEADING_SIZE = 50;

// Displays one recorded service.
export function ServiceHistoryCard({
  service,
  onOpen,
}: {
  service: ServiceHistoryItem;
  onOpen: () => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <HistoryCard
      chevron
      onOpen={onOpen}
      leading={
        <Center
          w={LEADING_SIZE}
          h={LEADING_SIZE}
          style={{
            flexShrink: 0,
            borderRadius: "var(--mantine-radius-lg)",
            backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 12%, transparent)",
          }}
        >
          <Wrench size={22} color="var(--mantine-color-primary-5)" />
        </Center>
      }
      /* What was done leads the card: it is the answer to "what did I last do". */
      title={service.action_names.length === 0 ? t("service.noActions") : service.action_names.join(" · ")}
      subtitle={service.service_date === null ? "" : dayjs(service.service_date).format("D. M. YYYY")}
      meta={
        <Group gap={6} wrap="nowrap">
          <Bike size={13} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
          <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
            {service.bike_name ?? t("service.unknownBike")}
          </Text>
        </Group>
      }
      metrics={
        <>
          <HistoryMetric icon={Wrench}>{t("service.actionCount", { count: service.action_count })}</HistoryMetric>
          {/* A service with no cost recorded shows no price; an explicit zero still reads
              as zero, because the user said the work was free. */}
          {service.total_cost !== null && (
            <HistoryMetric icon={Receipt}>
              {formatCost(service.total_cost, user?.currency ?? null, i18n.language)}
            </HistoryMetric>
          )}
        </>
      }
    />
  );
}
