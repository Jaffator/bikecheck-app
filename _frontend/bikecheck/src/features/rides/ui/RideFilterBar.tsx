// Desktop Přiřazené filter: every bike or one, in its colour, and the same Period switcher Service has.
import type { ReactElement } from "react";
import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeFilterChip } from "@/features/bikes/ui/BikeFilterChip";
import { useRideTableParams } from "@/features/rides/useRideTableParams";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";

export function RideFilterBar(): ReactElement {
  const { t } = useTranslation();
  const { bikeId, period, setBike, setPeriod } = useRideTableParams();
  const { data: bikes } = useBikes();

  return (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Group gap={8} wrap="wrap">
        <BikeFilterChip label={t("ridesTable.allBikes")} active={bikeId === null} onClick={() => setBike(null)} />
        {(bikes ?? []).map((bike) => (
          <BikeFilterChip
            key={bike.id}
            label={bikeTitle(bike)}
            colorIndex={bike.color_index}
            active={bikeId === bike.id}
            onClick={() => setBike(bike.id)}
          />
        ))}
      </Group>
      <HomePeriodSwitcher value={period} onChange={setPeriod} />
    </Group>
  );
}
