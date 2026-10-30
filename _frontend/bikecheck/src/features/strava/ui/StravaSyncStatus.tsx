// A context line's Strava entry: a dot for the connection and when rides last came in.
import type { ReactElement } from "react";
import { Box, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { SYNCED_AGO_KEYS, syncedAgo, useStravaLastSync } from "@/features/strava/stravaLastSync";

// Reports only: Strava's brand rules route every connection through their own button.
export function StravaSyncStatus(): ReactElement {
  const { t } = useTranslation();
  const { connected, lastSync } = useStravaLastSync();

  return (
    <Group gap={6} wrap="nowrap">
      <Box
        w={7}
        h={7}
        style={{ borderRadius: 9999, flexShrink: 0, backgroundColor: connected ? QUIET_COLOR : STRAVA_COLOR }}
      />
      <span>{stravaStatus(Boolean(connected), lastSync, t)}</span>
    </Group>
  );
}

const STRAVA_COLOR = "var(--mantine-color-strava-6)";

function stravaStatus(connected: boolean, lastSync: string | null, t: TFunction): string {
  const strava = t("strava.statusTitle");
  if (!connected) return `${strava} ${t("dashboard.notConnected")}`;
  if (lastSync === null) return strava;
  return `${strava} ${syncedAgo(lastSync, t, SYNCED_AGO_KEYS)}`;
}
