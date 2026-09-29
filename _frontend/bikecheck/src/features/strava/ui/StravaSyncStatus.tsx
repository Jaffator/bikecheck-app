// A context line's Strava entry: a dot for the connection and when rides last came in.
import type { ReactElement } from "react";
import { Anchor, Box, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRides } from "@/features/rides/rides.queries";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { useConnectStrava, usePendingRides } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { useCurrentUser } from "@/features/users/users.queries";

dayjs.extend(relativeTime);

interface StravaSyncStatusProps {
  // Offers the OAuth flow right in the line while Strava is not connected.
  withConnect?: boolean;
}

export function StravaSyncStatus({ withConnect = false }: StravaSyncStatusProps): ReactElement {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: rides } = useRides();
  const { data: pending } = usePendingRides();
  const connect = useConnectStrava();

  const connected = Boolean(user?.strava_athlete_id);
  const lastSync =
    user?.strava_last_sync_at ?? latestRideStart(rides?.pages[0]?.items[0]?.started_at ?? null, pending ?? []);
  const offerConnect = withConnect && user !== undefined && !connected;

  return (
    <Group gap={6} wrap="nowrap">
      <Box
        w={7}
        h={7}
        style={{
          borderRadius: 9999,
          flexShrink: 0,
          // Hollow where the line offers the connection itself: nothing is linked yet.
          backgroundColor: offerConnect ? "transparent" : connected ? QUIET_COLOR : STRAVA_COLOR,
          border: offerConnect ? `1px solid ${STRAVA_COLOR}` : undefined,
        }}
      />
      {offerConnect ? (
        <>
          <span>{t("strava.notConnectedShort")}</span>
          <span aria-hidden>·</span>
          <Anchor component="button" fz="inherit" c="primary.6" onClick={() => connect.mutate()}>
            {t("strava.connectLink")}
          </Anchor>
        </>
      ) : (
        <span>{stravaStatus(connected, lastSync, t)}</span>
      )}
    </Group>
  );
}

const STRAVA_COLOR = "var(--mantine-color-strava-6)";

// Before the first manual sync, the newest ride Strava delivered stands in for one.
function latestRideStart(lastRideStart: string | null, pending: PendingRide[]): string | null {
  const starts = [lastRideStart, ...pending.map((ride) => ride.started_at)].filter(
    (start): start is string => start !== null,
  );
  if (starts.length === 0) return null;
  return starts.reduce((latest, start) => (dayjs(start).isAfter(latest) ? start : latest));
}

function stravaStatus(connected: boolean, lastSync: string | null, t: TFunction): string {
  const strava = t("strava.statusTitle");
  if (!connected) return `${strava} · ${t("dashboard.notConnected")}`;
  if (lastSync === null) return strava;
  return `${strava} · ${t("dashboard.synced", { when: dayjs(lastSync).fromNow() })}`;
}
