// A small raised pill for a figure beside words: a share, a ×N badge. Dim like the words, so only the
// main value is bright.
import type { ReactElement, ReactNode } from "react";
import { Box } from "@mantine/core";

const HEIGHT = 22;
const SMALL_HEIGHT = 18;

export function Pill({ children, small = false }: { children: ReactNode; small?: boolean }): ReactElement {
  return (
    <Box
      component="span"
      className="tabular-nums"
      h={small ? SMALL_HEIGHT : HEIGHT}
      px={small ? 6 : 8}
      fz={small ? 10 : 11}
      fw={600}
      c="var(--color-text-dim)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        whiteSpace: "nowrap",
        borderRadius: 999,
        backgroundColor: "var(--color-surface-raised)",
      }}
    >
      {children}
    </Box>
  );
}
