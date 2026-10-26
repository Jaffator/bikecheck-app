// The phone's status row atop Home: two chips of one family, Strava's state and the garage's.
import type { ReactElement } from "react";
import { Group } from "@mantine/core";
import { GarageVisibilityChip } from "@/features/profile/ui/GarageVisibilityChip";
import { StravaSyncChip } from "@/features/strava/ui/StravaSyncChip";

export function StatusRow(): ReactElement {
  return (
    <Group justify="space-between" gap={8} wrap="nowrap">
      <StravaSyncChip />
      <GarageVisibilityChip />
    </Group>
  );
}
