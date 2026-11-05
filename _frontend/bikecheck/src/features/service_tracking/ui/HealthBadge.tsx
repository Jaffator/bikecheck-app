// The pill over a bike photo, reporting the machine as a whole. The garage card and the
// bike detail both wear it, so the two can never disagree about a bike's condition.
import type { CSSProperties, ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { attentionColor, overallLevel, worstAction } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

interface HealthBadgeProps {
  // The bike's Tracked Actions. The badge shows the worst Attention Level among them, so a
  // bike with nothing tracked — and only such a bike — reads "very good".
  actions: TrackedAction[];
  // For a table row: no photo behind it, so a soft tint replaces the dark backing.
  tinted?: boolean;
}

function onPhoto(color: string): CSSProperties {
  return {
    borderRadius: "9999px",
    backgroundColor: "rgba(20, 20, 20, 0.75)",
    border: `1px solid ${color}`,
    backdropFilter: "blur(4px)",
  };
}

function tint(color: string): CSSProperties {
  return { borderRadius: "9999px", backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)` };
}

export function HealthBadge({ actions, tinted = false }: HealthBadgeProps): ReactElement {
  const { t } = useTranslation();
  // What it says is the band the server drew; what colour it says it in is the ramp, which
  // warms earlier. A bike with nothing tracked reads quiet on both counts.
  const level = overallLevel(actions);
  const color = attentionColor(worstAction(actions)?.percentage ?? 0);

  return (
    <Group
      gap={tinted ? 6 : 5}
      h={tinted ? 26 : undefined}
      pl={8}
      pr={tinted ? 10 : 8}
      py={tinted ? 0 : 3}
      wrap="nowrap"
      style={tinted ? tint(color) : onPhoto(color)}
    >
      <Box
        w={tinted ? 7 : 6}
        h={tinted ? 7 : 6}
        style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }}
      />
      <Text
        className="tabular-nums"
        fz={tinted ? 12 : 10}
        fw={tinted ? 600 : undefined}
        c={color}
        style={{ whiteSpace: "nowrap" }}
      >
        {t(`bikes.health.${level}`)}
      </Text>
    </Group>
  );
}
