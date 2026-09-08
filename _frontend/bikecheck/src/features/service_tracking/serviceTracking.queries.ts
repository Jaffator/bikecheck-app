// Service Tracking query hooks.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { HealthReading } from "@/features/bikes_page/bikeHealth.types";
import { getBikeTrackedActions } from "./serviceTracking.api";
import { toHealthReading } from "./trackedActionLabels";
import type { TrackedAction } from "./serviceTracking.types";

// Its own key per bike, so a corrected part invalidates the readings of that bike alone,
// while a Service - which may touch any of them - invalidates the lot.
export function trackedActionsKey(bikeId?: number): (string | number)[] {
  return bikeId === undefined ? ["tracked-actions"] : ["tracked-actions", bikeId];
}

export function useBikeTrackedActions(bikeId: number): UseQueryResult<TrackedAction[]> {
  return useQuery({
    queryKey: trackedActionsKey(bikeId),
    queryFn: () => getBikeTrackedActions(bikeId),
  });
}

// The same readings for the badge over a bike photo, wherever that photo is. A bike whose
// Tracked Actions have not arrived yet has none, which reads as good.
export function useBikeHealthReadings(bikeId: number): HealthReading[] {
  const { t, i18n } = useTranslation();
  const { data: tracked } = useBikeTrackedActions(bikeId);

  return (tracked ?? []).map((action) => toHealthReading(action, i18n.language, t));
}
