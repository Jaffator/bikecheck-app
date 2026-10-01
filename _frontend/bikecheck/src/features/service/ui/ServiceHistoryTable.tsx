// Desktop Service's Historie: the filter's services by month, 25 to a page; a row opens the detail.
import { Fragment, useState, type ReactElement } from "react";
import { Box, Button, Group, Text } from "@mantine/core";
import { Plus } from "lucide-react";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import { Panel, PanelPageFooter, PanelSkeletonRows, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, onPanelRowKey } from "@/components/panelRows";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { HISTORY_TABLE_PAGE_SIZE, useServiceHistoryPage } from "@/features/service/service.queries";
import type { ServiceHistoryItem, ServiceMonthTotal, ServicePeriod } from "@/features/service/service.types";
import { formatServiceDateShort, groupServicesByMonth } from "@/features/service/serviceDates";
import { catalogueLabel, placeLabel } from "@/features/service/serviceLabels";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatCost } from "@/utils/money";
import { ServiceDetailSheet } from "./ServiceDetailSheet";

const HISTORY_COLUMNS = "88px minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr) 110px";

interface ServiceHistoryTableProps {
  // Null is every bike.
  bikeId: number | null;
  period: ServicePeriod;
  page: number;
  onPage: (page: number) => void;
  onAdd: () => void;
}

export function ServiceHistoryTable({ bikeId, period, page, onPage, onAdd }: ServiceHistoryTableProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, isPlaceholderData } = useServiceHistoryPage(bikeId ?? undefined, period, page);
  const [opened, setOpened] = useState<ServiceHistoryItem | null>(null);

  const items = data?.items ?? [];

  return (
    <Panel title={t("service.historyTitle")} count={data?.total}>
      {isLoading && <PanelSkeletonRows count={6} />}
      {isError && (
        <Text fz={13} c="red.5" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
          {t("service.loadFailed")}
        </Text>
      )}
      {data !== undefined && data.total === 0 && (
        <Group justify="space-between" wrap="nowrap" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
          <Text fz={13} c="var(--color-text-dim)">
            {t("service.emptyFilter")}
          </Text>
          <Button
            variant="outline"
            size="xs"
            radius="md"
            leftSection={<Plus size={14} color="var(--mantine-color-primary-5)" />}
            onClick={onAdd}
          >
            {t("fab.addService")}
          </Button>
        </Group>
      )}
      {data !== undefined && items.length > 0 && (
        // The page left on screen dims while the next one loads.
        <Box style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
          <PanelTableHead
            columns={HISTORY_COLUMNS}
            cells={[
              t("service.columnDate"),
              t("service.columnService"),
              t("service.columnBike"),
              t("service.columnPlace"),
              t("service.columnCost"),
            ]}
            rightAligned={[4]}
          />
          {groupServicesByMonth(items).map((group) => (
            <Fragment key={group.key}>
              <MonthHeader month={group.month} total={monthTotal(data.month_totals, group.month)} />
              {group.services.map((service) => (
                <HistoryRow key={service.id} service={service} onOpen={() => setOpened(service)} />
              ))}
            </Fragment>
          ))}
        </Box>
      )}
      {/* Also under a page past the last one, so the pager leads back. */}
      {data !== undefined && data.total > 0 && (
        <PanelPageFooter page={page} pageSize={HISTORY_TABLE_PAGE_SIZE} total={data.total} onPage={onPage} />
      )}

      <ServiceDetailSheet serviceId={opened?.id ?? null} seed={opened} onClose={() => setOpened(null)} />
    </Panel>
  );
}

function monthTotal(totals: ServiceMonthTotal[], month: Dayjs | null): ServiceMonthTotal | undefined {
  const key = month === null ? null : month.format("YYYY-MM");
  return totals.find((total) => total.month === key);
}

// A month split across pages repeats its header, with the whole month's totals each time.
function MonthHeader({ month, total }: { month: Dayjs | null; total: ServiceMonthTotal | undefined }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const label = month === null ? t("service.noDateGroup") : month.format("MMMM YYYY");

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="md"
      py={6}
      style={{
        borderTop: PANEL_HAIRLINE,
        backgroundColor: "color-mix(in srgb, var(--mantine-color-text-6) 3%, transparent)",
      }}
    >
      {/* Capitalised because it heads a figure, though Czech writes months small. */}
      <Text fz={12} fw={700} c="text.6">
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
      {total !== undefined && (
        <Text className="tabular-nums" fz={12} c="var(--color-text-dim)">
          {`${t("dashboard.servicesCount", { count: total.service_count })} · ${formatCost(
            total.total_cost,
            user?.currency ?? null,
            i18n.language,
          )}`}
        </Text>
      )}
    </Group>
  );
}

function HistoryRow({ service, onOpen }: { service: ServiceHistoryItem; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: bikes } = useBikes();
  const { data: user } = useCurrentUser();
  const first = service.actions[0];
  const more = service.actions.length - 1;
  const cost = service.total_cost;
  // A zero is still a price, but not one worth the weight - as the service card says it.
  const quietCost = cost === null || cost === 0;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil"
      style={{
        display: "grid",
        gridTemplateColumns: HISTORY_COLUMNS,
        alignItems: "center",
        gap: 16,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
      }}
    >
      <Text className="tabular-nums" fz={12} c="var(--color-text-dim)">
        {service.service_date === null ? "—" : formatServiceDateShort(service.service_date, i18n.language)}
      </Text>
      <Text fz={13} fw={600} c="text.6" lineClamp={1}>
        {first === undefined ? t("service.noActions") : catalogueLabel(first.i18n_key, first.name, t)}
        {more > 0 && (
          <Text span fz={13} fw={400} c="text.7">
            {" "}
            {t("service.moreActions", { count: more })}
          </Text>
        )}
      </Text>
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <BikeColorDot colorIndex={colorIndexOf(bikes, service.bike_id)} size={7} />
        <Text fz={12} c="text.7" lineClamp={1}>
          {service.bike_name ?? t("service.unknownBike")}
        </Text>
      </Group>
      <Text fz={12} c="text.7" lineClamp={1}>
        {placeLabel(service.place, service.shop_name, t) ?? "—"}
      </Text>
      <Text
        className="tabular-nums"
        fz={13}
        fw={quietCost ? 400 : 600}
        c={quietCost ? "var(--color-text-dim)" : "text.7"}
        ta="right"
        style={{ whiteSpace: "nowrap" }}
      >
        {cost === null ? "—" : formatCost(cost, user?.currency ?? null, i18n.language)}
      </Text>
    </Box>
  );
}
