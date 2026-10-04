// A job read against its interval: the mark is the interval, the fill how far the part has come.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";

// The bar runs past the interval, so an overdue job reads beyond the mark rather than stopping at it.
const BULLET_MAX = 125;

export function BulletBar({ percentage, color }: { percentage: number; color: string }): ReactElement {
  const fill = (Math.min(percentage, BULLET_MAX) / BULLET_MAX) * 100;
  const mark = (100 / BULLET_MAX) * 100;

  return (
    <Box
      aria-hidden
      pos="relative"
      h={6}
      w="100%"
      style={{
        minWidth: 0,
        borderRadius: 9999,
        backgroundColor: "var(--color-decor-sunk)",
      }}
    >
      <Box h="100%" w={`${String(fill)}%`} style={{ borderRadius: 9999, backgroundColor: color }} />
      <Box
        pos="absolute"
        top={-4}
        bottom={-4}
        left={`${String(mark)}%`}
        w={2}
        style={{
          borderRadius: 1,
          backgroundColor: "var(--mantine-color-text-6)",
          opacity: 0.55,
        }}
      />
    </Box>
  );
}
