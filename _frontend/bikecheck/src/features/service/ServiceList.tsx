// UI component using feature hooks.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ServiceHistoryCard } from "./ServiceHistoryCard";
import { SERVICE_CARD_SURFACE } from "./serviceCardSurface";
import { formatMonthHeading, groupServicesByMonth } from "./serviceDates";
import type { ServiceHistoryItem } from "./service.types";

interface ServiceListProps {
  services: ServiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  // Divides the list into Month Groups. The landing page shows too few services for a
  // month to mean anything, so only the full history asks for it.
  grouped?: boolean;
  // Rendered below the cards; the full history hangs its paging sentinel here.
  footer?: ReactNode;
}

// The service rows themselves, with the loading, failed and nothing-here states that
// stand in for them. Both the landing page and the full history render through this, so
// the two screens cannot drift apart.
export function ServiceList({ services, isLoading, isError, grouped = false, footer }: ServiceListProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function open(service: ServiceHistoryItem): void {
    navigate(`/service/${service.id}`);
  }

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

  if (grouped) {
    return (
      <>
        {groupServicesByMonth(services).map((group) => (
          <Stack key={group.key} gap="xs">
            <Text className="font-mono uppercase" fz={12} fw={600} c="var(--color-text-dim)" lts="0.08em">
              {group.month === null ? t("service.noDateGroup") : formatMonthHeading(group.month)}
            </Text>

            {/* The Month Group wears the card surface; its services are rows inside it. */}
            <Box style={SERVICE_CARD_SURFACE}>
              {group.services.map((service, index) => (
                <Box
                  key={service.id}
                  style={{
                    // A hairline between rows, never above the first one.
                    borderTop: index === 0 ? undefined : "1px solid var(--color-border-subtle)",
                  }}
                >
                  <ServiceHistoryCard
                    grouped
                    service={service}
                    onOpen={() => {
                      open(service);
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Stack>
        ))}
        {footer}
      </>
    );
  }

  return (
    <>
      {services.map((service) => (
        <ServiceHistoryCard
          key={service.id}
          service={service}
          onOpen={() => {
            open(service);
          }}
        />
      ))}
      {footer}
    </>
  );
}
