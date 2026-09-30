// The phone's pull on Rides: syncs with Strava when it may, otherwise only reloads the lists.
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/users/users.queries";
import { syncCooldownLeftMin } from "./syncCooldown";
import { useRunStravaSync } from "./useRunStravaSync";

// Stable while the user is, so the memoised lists it is passed to do not re-render.
export function useStravaPullRefresh(): () => Promise<void> {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { run } = useRunStravaSync();
  const connected = Boolean(user?.strava_athlete_id);
  const lastSyncAt = user?.strava_last_sync_at ?? null;

  return useCallback(async (): Promise<void> => {
    if (connected && syncCooldownLeftMin(lastSyncAt, Date.now()) === 0) await run();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rides"] }),
      queryClient.invalidateQueries({ queryKey: ["pendingRides"] }),
    ]);
  }, [connected, lastSyncAt, queryClient, run]);
}
