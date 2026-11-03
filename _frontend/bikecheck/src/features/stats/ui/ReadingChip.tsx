// The share a Home figure is read at, behind the icon of its reading: a trend, a ring or a mountain.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { Circle, Mountain, MoveRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { Trend, Yardstick } from "@/features/stats/figureReadings";

type ChipIcon = Trend | Yardstick["graphic"];

const ICONS: Record<ChipIcon, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: MoveRight,
  ring: Circle,
  mountain: Mountain,
};

const CHIP_HEIGHT = 20;

export function ReadingChip({ icon, label }: { icon: ChipIcon; label: string }): ReactElement {
  const Icon = ICONS[icon];

  return (
    // A span, so it can sit in a figure's detail text on the phone.
    <Box
      component="span"
      className="tabular-nums"
      h={CHIP_HEIGHT}
      px={7}
      fz={11}
      fw={600}
      c="text.6"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        borderRadius: 999,
        backgroundColor: "var(--color-surface-raised)",
      }}
    >
      <Icon size={12} strokeWidth={2.25} color="var(--mantine-color-primary-6)" aria-hidden />
      {label}
    </Box>
  );
}
