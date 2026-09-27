// Desktop Home's garage table, worst-off bike first; a row opens the bike.
import type { ReactElement } from "react";
import { Box, Center, Group, Image, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Gauge } from "lucide-react";
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
import { useDistance } from "@/features/stats/stats.queries";
import { BikeColorDot } from "./BikeColorDot";

const BIKE_COLUMNS = "56px minmax(0, 1.6fr) 100px 56px minmax(0, 1.4fr) 96px 16px";

export function GaragePanel(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);
  const { data: distance } = useDistance();

  const byBike = new Map<number, GarageTrackedAction[]>();
  for (const action of garage ?? []) byBike.set(action.bike_id, [...(byBike.get(action.bike_id) ?? []), action]);
  const worstOf = (bike: Bike): TrackedAction | null => worstAction(byBike.get(bike.id) ?? []);
  const rows = [...(bikes ?? [])].sort(
    (left, right) => (worstOf(right)?.percentage ?? 0) - (worstOf(left)?.percentage ?? 0),
  );
  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(Math.round(value));
  // The served year's distance; a bike with no ride in it is not listed, so it reads 0.
  const yearKm = (bike: Bike): number => distance?.bikes.find((ridden) => ridden.bike_id === bike.id)?.total_km ?? 0;

  return (
    <Panel
      title={t("sharing.cardTitle")}
      count={bikes?.length}
      link={{ label: t("page.bikes"), onClick: () => navigate("/bikes") }}
    >
      <PanelTableHead
        columns={BIKE_COLUMNS}
        cells={[
          "",
          t("bikes.columnBike"),
          distance === undefined ? t("bikes.columnDistance") : t("bikes.columnDistanceYear", { year: distance.year }),
          t("bikes.time"),
          t("bikes.columnWorstPart"),
          t("bikes.columnStatus"),
          "",
        ]}
        rightAligned={[2, 3, 5]}
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
              gap: 12,
              padding: PANEL_ROW_PADDING,
              borderTop: PANEL_HAIRLINE,
              transition: PRESS_TRANSITION,
            }}
          >
            <Thumb bike={bike} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <BikeColorDot colorIndex={bike.color_index} size={7} />
                <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
                  {bikeTitle(bike)}
                </Text>
              </Group>
              <Eyebrow>
                {[bike.bike_type, bike.wheel_size].filter((part) => part !== null && part !== "").join(" · ")}
              </Eyebrow>
            </Stack>
            <Text className="font-mono" fz={13} c="text.7" ta="right">
              {distance === undefined ? "—" : `${number(yearKm(bike))} km`}
            </Text>
            <Text className="font-mono" fz={13} c="text.7" ta="right">
              {number(bike.ride_time_min / 60)} h
            </Text>
            <Text fz={13} c="text.7" lineClamp={1}>
              {worst === null || worst.percentage === 0 ? (
                "—"
              ) : (
                <>
                  {trackedPartLabel(worst, t)}{" "}
                  <Text span className="font-mono" fz={13} c={attentionColor(worst.percentage)}>
                    {t("tracking.percentage", { value: worst.percentage })}
                  </Text>
                </>
              )}
            </Text>
            <Box style={{ justifySelf: "end" }}>
              {garage === undefined ? (
                <Skeleton h={18} w={68} radius="xl" />
              ) : (
                <HealthBadge actions={byBike.get(bike.id) ?? []} compact />
              )}
            </Box>
            <ChevronRight size={16} color="var(--color-text-dim)" />
          </Box>
        );
      })}
    </Panel>
  );
}

function Thumb({ bike }: { bike: Bike }): ReactElement {
  return (
    <Box w={56} h={28} style={{ borderRadius: "var(--mantine-radius-sm)", overflow: "hidden" }}>
      {bike.image_url ? (
        <Image src={bike.image_url} alt={bikeTitle(bike)} w="100%" h="100%" fit="cover" loading="lazy" bg="#FFFFFF" />
      ) : (
        <Center h="100%" bg="cards.7">
          <Gauge size={14} color="var(--mantine-color-text-9)" />
        </Center>
      )}
    </Box>
  );
}
