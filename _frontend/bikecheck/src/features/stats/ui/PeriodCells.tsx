// Two rows of cells, the Period before over this one, each cell shaded by how much was ridden in it.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import type { PeriodSeries } from "@/features/stats/distanceDays";
import { CURRENT_COLOR, EMPTY_COLOR, SHADOW_CELL_COLOR } from "./periodColors";

const CELL_HEIGHT = 12;
const LABEL_WIDTH = 28;
// A ridden cell never fades below this, so one short ride still reads against the empty ones.
const MIN_SHADE = 0.4;

interface PeriodCellsProps {
  series: PeriodSeries;
  // The rows' names: the Period before, then this one.
  labels: [string, string];
  label: string;
}

export function PeriodCells({ series, labels, label }: PeriodCellsProps): ReactElement {
  const top = Math.max(1, ...series.current, ...series.previous);
  const columns = Math.max(series.current.length, series.previous.length);

  return (
    <Stack gap={6} role="img" aria-label={label}>
      <Row label={labels[0]} values={series.previous} columns={columns} color={SHADOW_CELL_COLOR} top={top} />
      <Row label={labels[1]} values={series.current} columns={columns} color={CURRENT_COLOR} top={top} />
    </Stack>
  );
}

interface RowProps {
  label: string;
  values: number[];
  columns: number;
  color: string;
  top: number;
}

function Row({ label, values, columns, color, top }: RowProps): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      <Text className="tabular-nums" fz={10} c="var(--color-text-dim)" w={LABEL_WIDTH} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`, gap: 2 }}>
        {values.map((value, index) => (
          <Box
            key={index}
            h={CELL_HEIGHT}
            style={{
              borderRadius: 2,
              backgroundColor: value > 0 ? color : EMPTY_COLOR,
              opacity: value > 0 ? MIN_SHADE + (1 - MIN_SHADE) * (value / top) : 1,
            }}
          />
        ))}
      </Box>
    </Group>
  );
}
