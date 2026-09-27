// Desktop Home's latest Services; a row opens the Service's detail.
import { useState, type ReactElement } from "react";
import { Box, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { useRecentServices } from "@/features/service/service.queries";
import type { ServiceHistoryItem } from "@/features/service/service.types";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatCost } from "@/utils/money";
import { ServiceDetailSheet } from "./ServiceDetailSheet";

const SERVICE_COLUMNS = "64px minmax(0, 1fr) auto";

export function RecentServicesPanel(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useRecentServices();
  const [opened, setOpened] = useState<ServiceHistoryItem | null>(null);

  const services = data?.items ?? [];

  return (
    <Panel
      title={t("service.recentTitle")}
      link={{ label: t("service.all"), onClick: () => navigate("/service/history") }}
    >
      {isLoading && <PanelSkeletonRows count={3} />}
      {services.map((service) => {
        const first = service.actions[0];
        const more = service.actions.length - 1;
        const cost = service.total_cost;
        return (
          <Box
            key={service.id}
            role="button"
            tabIndex={0}
            onClick={() => setOpened(service)}
            onKeyDown={(event) => onPanelRowKey(event, () => setOpened(service))}
            className="hover-veil active:scale-[0.985]"
            style={{
              display: "grid",
              gridTemplateColumns: SERVICE_COLUMNS,
              alignItems: "center",
              gap: 12,
              padding: PANEL_ROW_PADDING,
              borderTop: PANEL_HAIRLINE,
              transition: PRESS_TRANSITION,
            }}
          >
            <Eyebrow>
              {service.service_date === null ? "—" : formatServiceDateShort(service.service_date, i18n.language)}
            </Eyebrow>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text fz={13} fw={600} c="text.6" lineClamp={1}>
                {first === undefined ? t("service.noActions") : catalogueLabel(first.i18n_key, first.name, t)}
                {more > 0 && (
                  <Text span fz={13} fw={400} c="text.7">
                    {" "}
                    {t("service.moreActions", { count: more })}
                  </Text>
                )}
              </Text>
              <Eyebrow>{service.bike_name ?? t("service.unknownBike")}</Eyebrow>
            </Stack>
            {/* A zero is still a price, but not one worth the weight - as the service card says it. */}
            <Text
              className="font-mono"
              fz={13}
              fw={cost === null || cost === 0 ? 400 : 600}
              c={cost === null || cost === 0 ? "var(--color-text-dim)" : "text.7"}
              style={{ whiteSpace: "nowrap" }}
            >
              {cost === null ? "" : formatCost(cost, user?.currency ?? null, i18n.language)}
            </Text>
          </Box>
        );
      })}
      <ServiceDetailSheet serviceId={opened?.id ?? null} seed={opened} onClose={() => setOpened(null)} />
    </Panel>
  );
}
