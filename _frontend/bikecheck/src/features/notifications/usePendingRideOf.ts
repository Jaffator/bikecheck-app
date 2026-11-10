// Which ride a notification still waits on. Read marks cannot say so: opening a row marks it read.
import { useCallback, useMemo } from "react";
import { usePendingRides } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import type { Notification } from "./notifications.types";

export function usePendingRideOf(): (notification: Notification) => PendingRide | undefined {
  const { data } = usePendingRides();
  const byActivity = useMemo(() => new Map((data ?? []).map((ride) => [ride.activity_id, ride])), [data]);

  return useCallback(
    (notification) => {
      const activityId = notification.payload?.activityId;
      return activityId === undefined ? undefined : byActivity.get(activityId);
    },
    [byActivity],
  );
}
