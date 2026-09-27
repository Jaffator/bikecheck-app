// Desktop Home's garage table, worst-off bike first; a row opens the bike.
import type { ReactElement } from "react";
import { Box, Center, Image, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Gauge } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import type { Bike } from "@/features/bikes/bikes.types";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, worstAction } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";

const BIKE_COLUMNS = "56px minmax(0, 1.6fr) 90px 60px minmax(0, 1.4fr) 110px";

// Every reading, so each bike's worst part and badge are read from the whole of it.
const EVERY_READING = 0;

export function GaragePanel(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);

  const byBike = new Map<number, GarageTrackedAction[]>();
  for (const action of garage ?? []) byBike.set(action.bike_id, [...(byBike.get(action.bike_id) ?? []), action]);
  const worstOf = (bike: Bike): TrackedAction | null => worstAction(byBike.get(bike.id) ?? []);
  const rows = [...(bikes ?? [])].sort(
    (left, right) => (worstOf(right)?.percentage ?? 0) - (worstOf(left)?.percentage ?? 0),
  );
  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(Math.round(value));

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
          t("bikes.columnDistance"),
          t("bikes.time"),
          t("bikes.columnWorstPart"),
          t("bikes.columnStatus"),
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
              gap: 16,
              padding: PANEL_ROW_PADDING,
              borderTop: PANEL_HAIRLINE,
              transition: PRESS_TRANSITION,
            }}
          >
            <Thumb bike={bike} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text fz={13} fw={600} c="text.6" lineClamp={1}>
                {bikeTitle(bike)}
              </Text>
              {bike.bike_type !== null && bike.bike_type !== "" && <Eyebrow>{bike.bike_type}</Eyebrow>}
            </Stack>
            <Text className="font-mono" fz={13} c="text.7" ta="right">
              {number(bike.total_km ?? 0)} km
            </Text>
            <Text className="font-mono" fz={13} c="text.7" ta="right">
              {number((bike.total_time_min ?? 0) / 60)} h
            </Text>
            <Text fz={13} c="text.7" lineClamp={1}>
              {worst === null || worst.percentage === 0 ? (
                "—"
              ) : (
                <>
                  {catalogueLabel(worst.action_i18n_key, worst.action_name, t)}{" "}
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
