import type { ReactElement } from "react";
import { Text } from "@mantine/core";

interface ProRow {
  label: string;
  value: string;
}

// The overview: one fact to a line.
export function ProRows({ rows }: { rows: ProRow[] }): ReactElement {
  return (
    <dl className="pro-rows tabular-nums">
      {rows.map((row) => (
        <div key={row.label} className="pro-rows__row">
          <Text component="dt" fz="inherit" lh="20px" c="text.7">
            {row.label}
          </Text>
          <Text component="dd" m={0} ta="right" fz="inherit" lh="20px" fw={500} c="text.6">
            {row.value}
          </Text>
        </div>
      ))}
    </dl>
  );
}
