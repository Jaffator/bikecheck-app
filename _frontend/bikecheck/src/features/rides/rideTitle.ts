import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { Ride } from "./rides.types";

// A ride keeps no Strava title (policy §6.2), so it is named by its local start hour.
export function rideTitle(ride: Ride, t: TFunction): string {
  if (ride.started_at === null) return t("rides.titleUndated");
  const hour = dayjs(ride.started_at).hour();
  if (hour >= 5 && hour < 12) return t("rides.titleMorning");
  if (hour >= 12 && hour < 17) return t("rides.titleAfternoon");
  return t("rides.titleEvening");
}
