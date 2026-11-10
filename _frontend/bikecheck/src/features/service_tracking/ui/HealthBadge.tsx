// The pill reporting the machine as a whole. The garage card, the bike detail and Home's garage
// table all wear it, so they can never disagree about a bike's condition.
import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { attentionColor, overallLevel, worstAction } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

interface HealthBadgeProps {
  // The bike's Tracked Actions. The badge shows the worst Attention Level among them, so a
  // bike with nothing tracked — and only such a bike — reads "very good".
  actions: TrackedAction[];
}

export function HealthBadge({ actions }: HealthBadgeProps): ReactElement {
  const { t } = useTranslation();
  // What it says is the band the server drew; what colour it says it in is the ramp, which
  // warms earlier. A bike with nothing tracked reads quiet on both counts.
  const level = overallLevel(actions);
  const color = attentionColor(worstAction(actions)?.percentage ?? 0);

  return (
    <Group
      gap={6}
      h={26}
      pl={8}
      pr={10}
      wrap="nowrap"
      style={{
        borderRadius: "9999px",
        // Tinted into the card's colour rather than see-through, so it reads the same on any photo as on a card.
        backgroundColor: `color-mix(in srgb, ${color} 13%, var(--mantine-color-cards-6))`,
      }}
    >
      <Box w={7} h={7} style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Text className="tabular-nums" fz={12} fw={600} c={color} style={{ whiteSpace: "nowrap" }}>
        {t(`bikes.health.${level}`)}
      </Text>
    </Group>
  );
}
