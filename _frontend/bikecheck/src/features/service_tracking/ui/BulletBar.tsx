// A job read against its interval as one line; the sunk track shows where the interval ends.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";

export function BulletBar({ percentage, color }: { percentage: number; color: string }): ReactElement {
  const fill = Math.min(percentage, 100);

  return (
    <Box
      aria-hidden
      h={4}
      w="100%"
      style={{ minWidth: 0, borderRadius: 2, backgroundColor: "var(--mantine-color-cards-9)" }}
    >
      <Box h="100%" w={`${String(fill)}%`} style={{ borderRadius: 2, backgroundColor: color }} />
    </Box>
  );
}
