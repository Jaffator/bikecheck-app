// The pill over a bike photo, reporting the machine as a whole. The garage card and the
// bike detail both wear it, so the two can never disagree about a bike's condition.
import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { attentionColor, overallLevel, worstAction } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

interface HealthBadgeProps {
  // The bike's Tracked Actions. The badge shows the worst Attention Level among them, so a
  // bike with nothing tracked — and only such a bike — reads "very good".
  actions: TrackedAction[];
  // Narrower, for a list row where the badge shares its line with the bike's name.
  compact?: boolean;
}

export function HealthBadge({ actions, compact = false }: HealthBadgeProps): ReactElement {
  const { t } = useTranslation();
  // What it says is the band the server drew; what colour it says it in is the ramp, which
  // warms earlier. A bike with nothing tracked reads quiet on both counts.
  const level = overallLevel(actions);
  const color = attentionColor(worstAction(actions)?.percentage ?? 0);

  return (
    <Group
      gap={compact ? 4 : 5}
      px={compact ? 6 : 8}
      py={compact ? 2 : 3}
      wrap="nowrap"
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: `1px solid ${color}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Box
        w={compact ? 5 : 6}
        h={compact ? 5 : 6}
        style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }}
      />
      <Text className="font-mono" fz={compact ? 9 : 10} c={color} style={{ whiteSpace: "nowrap" }}>
        {t(`bikes.health.${level}`)}
      </Text>
    </Group>
  );
}
