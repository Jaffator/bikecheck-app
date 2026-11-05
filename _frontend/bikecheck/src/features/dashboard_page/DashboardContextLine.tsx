// Desktop Home's line under the title: today, how big the garage is, and when the last ride was.
import type { ReactElement } from "react";
import { Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useRides } from "@/features/rides/rides.queries";

dayjs.extend(relativeTime);

export function DashboardContextLine(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: bikes } = useBikes();
  const { data: rides } = useRides();
  const lastRideAt = rides?.pages[0]?.items[0]?.started_at ?? null;

  return (
    <Text fz={13} c="text.8" className="tabular-nums">
      {todayLabel(i18n.language)}
      {bikes !== undefined && (
        <>
          {" · "}
          <Trans
            i18nKey="dashboard.contextBikes"
            count={bikes.length}
            components={{ 1: <Text span inherit fw={500} c="text.7" /> }}
          />
        </>
      )}
      {lastRideAt !== null && ` · ${t("dashboard.contextLastRide", { when: dayjs(lastRideAt).fromNow() })}`}
    </Text>
  );
}

// Intl, not dayjs: Czech needs the genitive month ("3. listopadu"), which dayjs does not inflect.
function todayLabel(language: string): string {
  const today = new Intl.DateTimeFormat(language, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return today.charAt(0).toUpperCase() + today.slice(1);
}
