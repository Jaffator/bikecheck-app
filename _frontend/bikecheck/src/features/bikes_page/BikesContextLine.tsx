// Desktop garage's line under the title: Strava and this year's distance; bike counts live on the tabs.
import type { ReactElement } from "react";
import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { formatKm } from "@/features/profile/profileFormat";
import { useDistance } from "@/features/stats/stats.queries";
import { StravaSyncStatus } from "@/features/strava/ui/StravaSyncStatus";

export function BikesContextLine(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance } = useDistance("year");
  const yearKm = distance?.bikes.reduce((total, bike) => total + bike.total_km, 0);

  return (
    <Group gap={8} wrap="wrap" fz={13} c="var(--color-text-dim)" className="tabular-nums">
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
