// Desktop Přiřazené: the filter's figures, then its rides by week, 20 to a page.
import { Fragment, useState, type ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Panel, PanelPageFooter, PanelSkeletonRows, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { formatDuration } from "@/features/rides/rideDuration";
import { useFilteredRides } from "@/features/rides/rides.queries";
import type { Ride, RideWeek } from "@/features/rides/rides.types";
import { TABLE_PAGE_SIZE, filterOf, groupByWeek, periodLabel, weekLabel } from "@/features/rides/ridesTable";
import { useRideTableParams } from "@/features/rides/useRideTableParams";
import { RideDetailSheet } from "./RideDetailSheet";
import { RideFiguresRow } from "./RideFiguresRow";
import { RIDE_TABLE_COLUMNS, RideTableRow } from "./RideTableRow";

interface AssignedRidesTableProps {
  // Strava activity id from a notification URL, opened once its page has loaded.
  openActivityId?: string;
  onOpenedActivityHandled?: () => void;
}

export function AssignedRidesTable({ openActivityId, onOpenedActivityHandled }: AssignedRidesTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const params = useRideTableParams();
  const { data, isLoading, isError } = useFilteredRides(filterOf(params), params.page);
  const { data: bikes } = useBikes();
  const [opened, setOpened] = useState<Ride | null>(null);

  const items = data?.items ?? [];
  const requested =
    openActivityId === undefined ? null : (items.find((ride) => ride.activity_strava_id === openActivityId) ?? null);
  // The fresh copy after a check-in refetch; the held one if the ride has left the filter since.
  const shownRide = (opened === null ? null : (items.find((ride) => ride.id === opened.id) ?? opened)) ?? requested;

  function closeSheet(): void {
    setOpened(null);
    onOpenedActivityHandled?.();
  }

  const title = periodLabel(params.period, i18n.language) ?? t("ridesTable.allRides");

  return (
    <Stack gap="md">
      <RideFiguresRow figures={data?.figures} period={params.period} />

      <Panel title={title} count={data?.total}>
        {isLoading && <PanelSkeletonRows count={5} />}
        {isError && (
          <Text fz={13} c="red.5" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
            {t("rides.loadFailed")}
          </Text>
        )}
        {data !== undefined && items.length === 0 && (
          <Text fz={13} c="var(--color-text-dim)" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
            {t("ridesTable.empty")}
          </Text>
        )}
        {data !== undefined && items.length > 0 && (
          <>
            <PanelTableHead
              columns={RIDE_TABLE_COLUMNS}
              cells={[
                t("ridesTable.columnRide"),
                t("ridesTable.columnBike"),
                t("ridesTable.columnKm"),
                t("rides.statDuration"),
                t("ridesTable.columnClimb"),
                t("rides.woreOff"),
                t("ridesTable.columnCheckIn"),
              ]}
              rightAligned={[2, 3, 4]}
            />
            {groupByWeek(items).map((group) => (
              <Fragment key={group.start ?? "undated"}>
                {group.start !== null && (
                  <WeekHeader start={group.start} week={data.weeks.find((week) => week.start === group.start)} />
                )}
                {group.rides.map((ride) => (
                  <RideTableRow
                    key={ride.id}
                    ride={ride}
                    colorIndex={colorIndexOf(bikes, ride.bike_id)}
                    onOpen={() => setOpened(ride)}
                  />
                ))}
              </Fragment>
            ))}
          </>
        )}
        {data !== undefined && data.total > 0 && (
          <PanelPageFooter page={params.page} pageSize={TABLE_PAGE_SIZE} total={data.total} onPage={params.setPage} />
        )}
      </Panel>

      <RideDetailSheet ride={shownRide} onClose={closeSheet} />
    </Stack>
  );
}

// A week split across pages repeats its header, with the whole week's total each time.
function WeekHeader({ start, week }: { start: string; week: RideWeek | undefined }): ReactElement {
  const { t, i18n } = useTranslation();

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
      <Text fz={12} fw={700} c="text.6">
        {weekLabel(start, i18n.language, t)}
      </Text>
      {week !== undefined && (
        <Text className="tabular-nums" fz={12} c="var(--color-text-dim)">
          {[
            t("dashboard.ridesCount", { count: week.count }),
            t("pendingRides.distance", { count: Math.round(week.km) }),
            formatDuration(week.time_min),
          ].join(" · ")}
        </Text>
      )}
    </Group>
  );
}
