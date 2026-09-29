// A context line's Strava entry: a dot for the connection and when rides last came in.
import type { ReactElement } from "react";
import { Box, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRides } from "@/features/rides/rides.queries";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { usePendingRides } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { useCurrentUser } from "@/features/users/users.queries";

dayjs.extend(relativeTime);

export function StravaSyncStatus(): ReactElement {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: rides } = useRides();
  const { data: pending } = usePendingRides();

  const connected = Boolean(user?.strava_athlete_id);
  const lastStart = latestRideStart(rides?.pages[0]?.items[0]?.started_at ?? null, pending ?? []);

  return (
    <Group gap={6} wrap="nowrap">
      <Box
        w={7}
        h={7}
        style={{
          borderRadius: 9999,
          flexShrink: 0,
          backgroundColor: connected ? QUIET_COLOR : "var(--mantine-color-strava-6)",
        }}
      />
      <span>{stravaStatus(connected, lastStart, t)}</span>
    </Group>
  );
}

// There is no sync timestamp, so the newest ride Strava delivered stands in for one.
function latestRideStart(lastRideStart: string | null, pending: PendingRide[]): string | null {
  const starts = [lastRideStart, ...pending.map((ride) => ride.started_at)].filter(
    (start): start is string => start !== null,
  );
  if (starts.length === 0) return null;
  return starts.reduce((latest, start) => (dayjs(start).isAfter(latest) ? start : latest));
}

function stravaStatus(connected: boolean, lastStart: string | null, t: TFunction): string {
  const strava = t("strava.statusTitle");
  if (!connected) return `${strava} · ${t("dashboard.notConnected")}`;
  if (lastStart === null) return strava;
  return `${strava} · ${t("dashboard.synced", { when: dayjs(lastStart).fromNow() })}`;
}
