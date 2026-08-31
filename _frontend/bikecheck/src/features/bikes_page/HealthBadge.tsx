// The pill over a bike photo, reporting the machine as a whole. The garage card and the
// bike detail both wear it, so the two can never disagree about a bike's condition.
import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { HEALTH_COLORS, overallLevel, type HealthReading } from "./bikeHealth.types";

interface HealthBadgeProps {
  // Empty until the API serves per-bike wear, which reads as "good" - see the ticket that
  // fills these; the badge is not the place to hide it.
  readings: HealthReading[];
}

export function HealthBadge({ readings }: HealthBadgeProps): ReactElement {
  const { t } = useTranslation();
  const level = overallLevel(readings);
  const color = HEALTH_COLORS[level];

  return (
    <Group
      gap={5}
      px={8}
      py={3}
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: `1px solid ${color}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Box w={6} h={6} style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Text className="font-mono" fz={10} c={color}>
        {t(`bikes.health.${level}`)}
      </Text>
    </Group>
  );
}
