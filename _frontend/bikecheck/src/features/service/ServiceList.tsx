// UI component using feature hooks.
import type { ReactElement, ReactNode } from "react";
import { Group, Loader, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tapFeedback } from "@/utils/haptics";
import { ServiceHistoryCard } from "./ServiceHistoryCard";
import type { ServiceHistoryItem } from "./service.types";

interface ServiceListProps {
  services: ServiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  // Rendered below the cards; the full history hangs its paging sentinel here.
  footer?: ReactNode;
}

// The service rows themselves, with the loading, failed and nothing-here states that
// stand in for them. Both the landing page and the full history render through this, so
// the two screens cannot drift apart.
export function ServiceList({ services, isLoading, isError, footer }: ServiceListProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text size="sm" c="red.5">
        {t("service.loadFailed")}
      </Text>
    );
  }

  if (services.length === 0) {
    return (
      <Text fz={14} c="var(--color-text-dim)">
        {t("service.emptyForBike")}
      </Text>
    );
  }

  return (
    <>
      {services.map((service) => (
        <ServiceHistoryCard
          key={service.id}
          service={service}
          onOpen={() => {
            void tapFeedback();
            navigate(`/service/${service.id}`);
          }}
        />
      ))}
      {footer}
    </>
  );
}
