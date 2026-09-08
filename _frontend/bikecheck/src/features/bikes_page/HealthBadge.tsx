// The pill over a bike photo, reporting the machine as a whole. The garage card and the
// bike detail both wear it, so the two can never disagree about a bike's condition.
import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ATTENTION_COLORS, overallLevel } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

interface HealthBadgeProps {
  // The bike's Tracked Actions. The badge shows the worst Attention Level among them, so a
  // bike with nothing tracked — and only such a bike — reads "good".
  actions: TrackedAction[];
}

export function HealthBadge({ actions }: HealthBadgeProps): ReactElement {
  const { t } = useTranslation();
  const level = overallLevel(actions);
  const color = ATTENTION_COLORS[level];

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
