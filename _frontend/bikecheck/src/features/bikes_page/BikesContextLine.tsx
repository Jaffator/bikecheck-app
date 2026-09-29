// Desktop garage's line under the title: how many bikes are in use and put away, Strava, and this year's distance.
import type { ReactElement } from "react";
import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { formatKm } from "@/features/profile/profileFormat";
import { useDistance } from "@/features/stats/stats.queries";
import { StravaSyncStatus } from "@/features/strava/ui/StravaSyncStatus";

interface BikesContextLineProps {
  activeCount: number;
  archivedCount: number;
}

export function BikesContextLine({ activeCount, archivedCount }: BikesContextLineProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance } = useDistance("year");
  const yearKm = distance?.bikes.reduce((total, bike) => total + bike.total_km, 0);

  return (
    <Group gap={8} wrap="wrap" fz={13} c="var(--color-text-dim)" className="tabular-nums">
      <span>{t("bikes.activeCount", { count: activeCount })}</span>
      <Separator />
      <span>{t("bikes.archivedCount", { count: archivedCount })}</span>
      <Separator />
      <StravaSyncStatus />
      {yearKm !== undefined && (
        <>
          <Separator />
          <span>{t("bikes.distanceThisYear", { km: formatKm(yearKm, i18n.language) })}</span>
        </>
      )}
    </Group>
  );
}

function Separator(): ReactElement {
  return <span aria-hidden>·</span>;
}
