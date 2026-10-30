// Home's Strava chip: a dot for the connection and when rides last came in. Connected, it
// opens the sync sheet; not yet, it only reports - Strava's button below is the way in.
import { useState, type ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { StatusChip } from "@/components/StatusChip";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { AGO_KEYS, syncedAgo, useStravaLastSync } from "@/features/strava/stravaLastSync";
import { StravaSyncSheet } from "./StravaSyncSheet";

const STRAVA_COLOR = "var(--mantine-color-strava-6)";

export function StravaSyncChip(): ReactElement {
  const { t } = useTranslation();
  const { connected, lastSync } = useStravaLastSync();
  const [syncOpened, setSyncOpened] = useState(false);

  // Not connected, the chip is the dot and the name: the pitch card under it says the rest.
  const detail = connected ? whenSynced(lastSync, t) : "";
  const label = connected ? detail : t("dashboard.notConnected");
  const dotColor = connected ? QUIET_COLOR : STRAVA_COLOR;

  function open(): void {
    if (connected) setSyncOpened(true);
  }

  return (
    <>
      <StatusChip tone="quiet" label={`${t("strava.statusTitle")} · ${label}`} onClick={open} hasPopup={connected}>
        <Box
          aria-hidden
          w={8}
          h={8}
          style={{
            borderRadius: 999,
            flexShrink: 0,
            backgroundColor: dotColor,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dotColor} 18%, transparent)`,
          }}
        />
        <span>{t("strava.statusTitle")}</span>
        {detail !== "" && (
          <Text span inherit fw={500} c="var(--color-text-dim)" className="tabular-nums">
            {detail}
          </Text>
        )}
      </StatusChip>

      <StravaSyncSheet opened={syncOpened} onClose={() => setSyncOpened(false)} />
    </>
  );
}

function whenSynced(lastSync: string | null, t: TFunction): string {
  return lastSync === null ? t("strava.neverSynced") : syncedAgo(lastSync, t, AGO_KEYS);
}
