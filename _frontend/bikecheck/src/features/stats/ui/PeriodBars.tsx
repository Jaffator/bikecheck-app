// The Period's buckets as bars, each against the same bucket of the Period before as a grey shadow.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { GRAPHIC_HEIGHT } from "@/components/FigureSection";
import type { PeriodSeries } from "@/features/stats/distanceDays";
import { CURRENT_COLOR, FUTURE_COLOR, SHADOW_COLOR } from "./periodColors";

// A bucket ridden a little still shows, and so does the one today falls in.
const MIN_BAR = 2;

export function PeriodBars({ series, label }: { series: PeriodSeries; label: string }): ReactElement {
  const top = Math.max(1, ...series.current, ...series.previous);
  const height = (value: number): number => Math.max(MIN_BAR, (value / top) * GRAPHIC_HEIGHT);

  return (
    <Box
      role="img"
      aria-label={label}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${String(series.current.length)}, minmax(0, 1fr))`,
        gap: series.current.length > 6 ? 4 : 6,
      }}
    >
      {series.current.map((value, index) => {
        const previous = series.previous[index];
        // A bucket still to come shows its shadow, or a faint line where there is none; today's shows at least a line.
        const drawn = index < series.today ? value > 0 : index === series.today;
        const future = index > series.today && previous === 0;
        return (
          <Box key={index} pos="relative" h={GRAPHIC_HEIGHT}>
            {previous > 0 && <Bar height={height(previous)} color={SHADOW_COLOR} />}
            {drawn && <Bar height={height(value)} color={CURRENT_COLOR} />}
            {future && <Bar height={MIN_BAR} color={FUTURE_COLOR} />}
          </Box>
        );
      })}
    </Box>
  );
}

function Bar({ height, color }: { height: number; color: string }): ReactElement {
  return <Box pos="absolute" left={0} right={0} bottom={0} h={height} style={{ borderRadius: 2, backgroundColor: color }} />;
}
