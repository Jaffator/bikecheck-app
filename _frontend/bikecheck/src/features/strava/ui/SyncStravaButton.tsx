// Desktop's on-demand Strava sync: fetches the rides a missed webhook never delivered.
import { useEffect, useState, type ReactElement } from "react";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useSyncStrava } from "@/features/strava/strava.queries";
import { syncCooldownLeftMin } from "@/features/strava/syncCooldown";
import { useCurrentUser } from "@/features/users/users.queries";

// The label counts whole minutes, so a tick well under one keeps it honest.
const COOLDOWN_TICK_MS = 15 * 1000;

export function SyncStravaButton(): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const sync = useSyncStrava();
  const now = useNow(COOLDOWN_TICK_MS);

  if (!user?.strava_athlete_id) return null;
  const cooldownMin = syncCooldownLeftMin(user.strava_last_sync_at, now);

  function run(): void {
    sync.mutate(undefined, {
      onSuccess: ({ queued }) => {
        notifications.show({
          message: queued > 0 ? t("strava.syncQueued", { count: queued }) : t("strava.syncNothing"),
        });
      },
      // A 429 means another tab or device synced first; the cooldown label takes over once the user reloads.
      onError: (error) => {
        notifications.show({
          color: "red.5",
          message: error.status === 429 ? t("strava.syncTooSoon") : t("strava.syncFailed"),
        });
      },
    });
  }

  return (
    <Button
      variant="outline"
      radius="md"
      leftSection={<RefreshCw size={16} color="var(--mantine-color-primary-6)" />}
      loading={sync.isPending}
      disabled={cooldownMin > 0}
      styles={disabledButtonStyles}
      onClick={run}
    >
      {cooldownMin > 0 ? t("strava.syncCooldown", { minutes: cooldownMin }) : t("strava.sync")}
    </Button>
  );
}

// Re-renders every interval, so a cooldown ends without a click.
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
