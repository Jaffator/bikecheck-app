// A job read against its interval as one hairline; the figure beside it says how far past due.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";

export function BulletBar({ percentage, color }: { percentage: number; color: string }): ReactElement {
  const fill = Math.min(percentage, 100);

  return (
    <Box
      aria-hidden
      h={2}
      w="100%"
      style={{ minWidth: 0, borderRadius: 2, backgroundColor: "var(--color-decor-sunk)" }}
    >
      <Box h="100%" w={`${String(fill)}%`} style={{ borderRadius: 2, backgroundColor: color }} />
    </Box>
  );
}
