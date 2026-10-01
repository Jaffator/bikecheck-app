// Desktop Service's line under the title: when the last service was, and on which bike.
import type { ReactElement } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRecentServices } from "@/features/service/service.queries";
import type { ServiceHistoryItem } from "@/features/service/service.types";

dayjs.extend(relativeTime);

interface ServiceContextLineProps {
  // Null is every bike; a chosen bike is already named by its chip, so the line drops the name.
  bikeId: number | null;
}

export function ServiceContextLine({ bikeId }: ServiceContextLineProps): ReactElement {
  const { t } = useTranslation();
  const { data } = useRecentServices(bikeId ?? undefined);

  return (
    <Text fz={13} c="var(--color-text-dim)" className="tabular-nums">
      {/* A blank line while loading, so the filters below do not jump when it lands. */}
      {data === undefined ? " " : lastServiceLine(data.items[0], bikeId === null, t)}
    </Text>
  );
}

function lastServiceLine(latest: ServiceHistoryItem | undefined, withBike: boolean, t: TFunction): string {
  if (latest === undefined) return t("service.noServiceYet");
  const line =
    latest.service_date === null
      ? t("service.lastServiceUndated")
      : t("service.lastService", { when: serviceDayAgo(latest.service_date, t) });
  return withBike && latest.bike_name !== null ? `${line} · ${latest.bike_name}` : line;
}

// The date has no time of day, so today and yesterday are named rather than counted in hours.
function serviceDayAgo(serviceDate: string, t: TFunction): string {
  const day = dayjs(serviceDate);
  if (day.isSame(dayjs(), "day")) return t("service.lastServiceToday");
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return t("service.lastServiceYesterday");
  return day.startOf("day").from(dayjs().startOf("day"));
}
