// Home's Strava chip: a green or red dot for the connection, and when rides last came in.
// Connected, it opens the sync sheet; not yet, it only reports - Strava's button below is the way in.
import { useState, type ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { StatusChip } from "@/components/StatusChip";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { AGO_KEYS, syncedAgo, useStravaLastSync } from "@/features/strava/stravaLastSync";
import { StravaSyncSheet } from "./StravaSyncSheet";

const DISCONNECTED_COLOR = "var(--mantine-color-red-5)";

export function StravaSyncChip(): ReactElement {
  const { t } = useTranslation();
  const { connected, lastSync } = useStravaLastSync();
  const [syncOpened, setSyncOpened] = useState(false);

  // A disconnected account may still have rides from before, so their time shows either way.
  const detail = connected || lastSync !== null ? whenSynced(lastSync, t) : "";
  const label = [connected ? "" : t("dashboard.notConnected"), detail].filter(Boolean).join(" · ");
  const dotColor = connected ? QUIET_COLOR : DISCONNECTED_COLOR;

  function open(): void {
    if (connected) setSyncOpened(true);
  }

  return (
    <>
      <StatusChip label={`${t("strava.statusTitle")} · ${label}`} onClick={open} hasPopup={connected}>
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
          <Text span inherit fw={500} c="text.8" className="tabular-nums">
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
