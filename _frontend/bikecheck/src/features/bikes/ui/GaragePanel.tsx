// Desktop Home's garage table, worst-off bike first; a row opens the bike.
import type { ReactElement } from "react";
import { Box, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import type { Bike } from "@/features/bikes/bikes.types";
import {
  EVERY_READING,
  attentionColor,
  trackedPartLabel,
  worstAction,
} from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";
import { SetupShortcut } from "@/features/setup/ui/SetupShortcut";
import { homePeriodLabel, isCustomPeriod } from "@/features/stats/homePeriod";
import { useDistance } from "@/features/stats/stats.queries";
import type { DistanceBike, HomePeriod } from "@/features/stats/stats.types";
import { formatNumber } from "@/utils/number";
import { BikeThumb } from "./BikeThumb";

// Distance and time are equally wide and left-aligned, so they and the worst part start evenly apart.
const BIKE_COLUMNS = "56px minmax(0, 1fr) 116px 116px minmax(0, 1fr) 96px 34px 16px";
const BIKE_COLUMN_GAP = 12;

// Distance and time read Home's Period; the worst part and the status are about now.
export function GaragePanel({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);
  const { data: distance } = useDistance(period);
  const label = homePeriodLabel(period, i18n.language, t);
  const custom = isCustomPeriod(period);

  const byBike = new Map<number, GarageTrackedAction[]>();
  for (const action of garage ?? []) byBike.set(action.bike_id, [...(byBike.get(action.bike_id) ?? []), action]);
  const worstOf = (bike: Bike): TrackedAction | null => worstAction(byBike.get(bike.id) ?? []);
  const rows = [...(bikes ?? [])].sort(
    (left, right) => (worstOf(right)?.percentage ?? 0) - (worstOf(left)?.percentage ?? 0),
  );
  const number = (value: number): string => formatNumber(Math.round(value), i18n.language);
  // A bike with no ride in the Period is not listed, so it reads 0 km and 0 h.
  const ridden = (bike: Bike): DistanceBike | undefined => distance?.bikes.find((row) => row.bike_id === bike.id);

  return (
    <Panel
      title={t("page.bikes")}
      count={bikes?.length}
      link={{ label: t("page.bikes"), onClick: () => navigate("/bikes") }}
    >
      <PanelTableHead
        columns={BIKE_COLUMNS}
        cells={[
          "",
          t("bikes.columnBike"),
          // Days do not fit the column; the switcher above it names them.
          custom ? t("bikes.columnDistance") : t("bikes.columnDistancePeriod", { period: label }),
          custom ? t("bikes.columnTime") : t("bikes.columnTimePeriod", { period: label }),
          t("bikes.columnWorstPart"),
          t("bikes.columnStatus"),
          "",
          "",
        ]}
        rightAligned={[5]}
        gap={BIKE_COLUMN_GAP}
      />
      {rows.map((bike) => {
        const worst = worstOf(bike);
        const open = (): void => {
          void navigate(`/bikes/${String(bike.id)}`);
        };
        return (
          <Box
            key={bike.id}
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(event) => onPanelRowKey(event, open)}
            className="hover-veil active:scale-[0.985]"
            style={{
              display: "grid",
              gridTemplateColumns: BIKE_COLUMNS,
              alignItems: "center",
              gap: BIKE_COLUMN_GAP,
              padding: PANEL_ROW_PADDING,
              borderTop: PANEL_HAIRLINE,
              transition: PRESS_TRANSITION,
            }}
          >
            <BikeThumb bike={bike} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
                  {bikeTitle(bike)}
                </Text>
              </Group>
              <Eyebrow>
                {[bike.bike_type, bike.wheel_size].filter((part) => part !== null && part !== "").join(" · ")}
              </Eyebrow>
            </Stack>
            <Text className="tabular-nums" fz={13} c="text.7">
              {distance === undefined ? "—" : `${number(ridden(bike)?.total_km ?? 0)} km`}
            </Text>
            <Text className="tabular-nums" fz={13} c="text.7">
              {distance === undefined ? "—" : `${number((ridden(bike)?.time_min ?? 0) / 60)} h`}
            </Text>
            <Text fz={13} c="text.7" lineClamp={1}>
              {worst === null || worst.percentage === 0 ? (
                "—"
              ) : (
                <>
                  {trackedPartLabel(worst, t)}{" "}
                  <Text span className="tabular-nums" fz={13} c={attentionColor(worst.percentage)}>
                    {t("tracking.percentage", { value: worst.percentage })}
                  </Text>
                </>
              )}
            </Text>
            <Box style={{ justifySelf: "end" }}>
              {garage === undefined ? (
                <Skeleton h={26} w={80} radius="xl" />
              ) : (
                <HealthBadge actions={byBike.get(bike.id) ?? []} />
              )}
            </Box>
            <SetupShortcut bikeId={bike.id} />
            <ChevronRight size={16} color="var(--mantine-color-text-8)" />
          </Box>
        );
      })}
    </Panel>
  );
}
