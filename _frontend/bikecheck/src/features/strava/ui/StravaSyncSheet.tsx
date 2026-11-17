// The sheet Home's Strava chip opens: when rides last came in, a sync on demand, and the way out.
import { useState, type ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { useStravaLastSync } from "@/features/strava/stravaLastSync";
import { DisconnectStravaConfirm } from "./DisconnectStravaConfirm";
import { SyncStravaButton } from "./SyncStravaButton";

// Above the page it opens from, matching the settings drawers.
const DRAWER_Z_INDEX = 320;

interface StravaSyncSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function StravaSyncSheet({ opened, onClose }: StravaSyncSheetProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { lastSync } = useStravaLastSync();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      zIndex={DRAWER_Z_INDEX}
      title={t("strava.syncTitle")}
      styles={{
        content: { height: "auto", maxHeight: "88dvh" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="lg">
        <Group justify="space-between" wrap="nowrap" fz={14}>
          <Text span c="var(--color-text-dim)">
            {t("strava.lastSync")}
          </Text>
          <Text span className="tabular-nums" c="text.6" fw={600}>
            {lastSync === null ? t("strava.neverSynced") : syncedAt(lastSync, i18n.language)}
          </Text>
        </Group>

        <SyncStravaButton fullWidth />

        {/* Quiet and red: a destructive way out, not a second action. */}
        <UnstyledButton onClick={() => setConfirmingDisconnect(true)} py={8} ta="center" fz={14} fw={600} c="red.5">
          {t("strava.disconnect")}
        </UnstyledButton>
      </Stack>

      <DisconnectStravaConfirm
        opened={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        onDisconnected={onClose}
      />
    </ResponsiveSheet>
  );
}

function syncedAt(lastSync: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSync));
}
