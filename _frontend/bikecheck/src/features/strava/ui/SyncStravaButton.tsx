// Desktop's on-demand Strava sync: fetches the rides a missed webhook never delivered.
import { useEffect, useState, type ReactElement } from "react";
import { Button } from "@mantine/core";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { syncCooldownLeftMin } from "@/features/strava/syncCooldown";
import { useRunStravaSync } from "@/features/strava/useRunStravaSync";
import { useCurrentUser } from "@/features/users/users.queries";

// The label counts whole minutes, so a tick well under one keeps it honest.
const COOLDOWN_TICK_MS = 15 * 1000;

export function SyncStravaButton(): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const sync = useRunStravaSync();
  const now = useNow(COOLDOWN_TICK_MS);

  if (!user?.strava_athlete_id) return null;
  const cooldownMin = syncCooldownLeftMin(user.strava_last_sync_at, now);

  return (
    <Button
      variant="outline"
      radius="md"
      className="tabular-nums"
      leftSection={<RefreshCw size={16} color="var(--mantine-color-primary-6)" />}
      loading={sync.isPending}
      disabled={cooldownMin > 0}
      styles={disabledButtonStyles}
      onClick={() => void sync.run()}
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
