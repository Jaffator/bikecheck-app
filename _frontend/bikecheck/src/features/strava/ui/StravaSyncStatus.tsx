// A context line's Strava entry: a dot for the connection and when rides last came in.
import type { ReactElement } from "react";
import { Anchor, Box, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { useConnectStrava } from "@/features/strava/strava.queries";
import { SYNCED_AGO_KEYS, syncedAgo, useStravaLastSync } from "@/features/strava/stravaLastSync";

interface StravaSyncStatusProps {
  // Offers the OAuth flow right in the line while Strava is not connected.
  withConnect?: boolean;
}

export function StravaSyncStatus({ withConnect = false }: StravaSyncStatusProps): ReactElement {
  const { t } = useTranslation();
  const { connected, lastSync } = useStravaLastSync();
  const connect = useConnectStrava();

  const offerConnect = withConnect && connected === false;

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
        <span>{stravaStatus(Boolean(connected), lastSync, t)}</span>
      )}
    </Group>
  );
}

const STRAVA_COLOR = "var(--mantine-color-strava-6)";

function stravaStatus(connected: boolean, lastSync: string | null, t: TFunction): string {
  const strava = t("strava.statusTitle");
  if (!connected) return `${strava} · ${t("dashboard.notConnected")}`;
  if (lastSync === null) return strava;
  return `${strava} · ${syncedAgo(lastSync, t, SYNCED_AGO_KEYS)}`;
}
