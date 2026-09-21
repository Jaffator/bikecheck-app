import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";

// Caps the number so a busy badge never widens the icon it sits on.
const BADGE_CAP = 9;

interface HeaderCountBadgeProps {
  count: number;
}

// The pill at the top-right of a top-bar icon: the bell and the Users icon share it so the
// two counts in one bar read as one voice. Renders nothing at zero.
export function HeaderCountBadge({ count }: HeaderCountBadgeProps): ReactElement | null {
  if (count <= 0) return null;
  return (
    <Box
      pos="absolute"
      top={2}
      right={0}
      miw={16}
      h={16}
      px={4}
      style={{
        borderRadius: "9999px",
        backgroundColor: "var(--mantine-color-primary-6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Blends the badge border into the header.
        border: "none",
      }}
    >
      <Text className="font-mono" fz={10} fw={700} c="var(--mantine-color-cards-8)" lh={1}>
        {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
      </Text>
    </Box>
  );
}
