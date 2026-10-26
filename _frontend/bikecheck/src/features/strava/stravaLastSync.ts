// When rides last came in from Strava, shared by the context lines and Home's chip.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useRides } from "@/features/rides/rides.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { usePendingRides } from "./strava.queries";
import type { PendingRide } from "./strava.types";

export interface StravaLastSync {
  // Undefined until the user loads; guessing "not connected" would flash the wrong state.
  connected: boolean | undefined;
  lastSync: string | null;
}

export function useStravaLastSync(): StravaLastSync {
  const { data: user } = useCurrentUser();
  const { data: rides } = useRides();
  const { data: pending } = usePendingRides();

  const lastSync =
    user?.strava_last_sync_at ?? latestRideStart(rides?.pages[0]?.items[0]?.started_at ?? null, pending ?? []);
  return { connected: user === undefined ? undefined : Boolean(user.strava_athlete_id), lastSync };
}

// Before the first manual sync, the newest ride Strava delivered stands in for one.
function latestRideStart(lastRideStart: string | null, pending: PendingRide[]): string | null {
  const starts = [lastRideStart, ...pending.map((ride) => ride.started_at)].filter(
    (start): start is string => start !== null,
  );
  if (starts.length === 0) return null;
  return starts.reduce((latest, start) => (dayjs(start).isAfter(latest) ? start : latest));
}

export interface AgoKeys {
  now: string;
  minutes: string;
  hours: string;
  days: string;
}

// The context line names the sync; the chip stands next to "Strava" and only says when.
export const SYNCED_AGO_KEYS: AgoKeys = {
  now: "dashboard.syncedJustNow",
  minutes: "dashboard.syncedMinutes",
  hours: "dashboard.syncedHours",
  days: "dashboard.syncedDays",
};
export const AGO_KEYS: AgoKeys = {
  now: "dashboard.agoJustNow",
  minutes: "dashboard.agoMinutes",
  hours: "dashboard.agoHours",
  days: "dashboard.agoDays",
};

// Neither line has room for "3 hours ago", so a letter carries the unit.
export function syncedAgo(lastSync: string, t: TFunction, keys: AgoKeys): string {
  const minutes = dayjs().diff(lastSync, "minute");
  if (minutes < 1) return t(keys.now);
  if (minutes < 60) return t(keys.minutes, { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(keys.hours, { count: hours });
  return t(keys.days, { count: Math.floor(hours / 24) });
}
