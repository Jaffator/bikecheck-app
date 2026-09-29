// The heading row of a panel on somebody's bike: an icon, the name, and whatever the panel
// hangs at the right edge - a count, the profile chips.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Text } from "@mantine/core";

interface UserBikeSectionTitleProps {
  icon: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}

export function UserBikeSectionTitle({ icon, children, aside }: UserBikeSectionTitleProps): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" px="md" pt="md" pb="xs">
      <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Box style={{ display: "flex", color: "var(--color-text-dim)", flexShrink: 0 }}>{icon}</Box>
        <Text fz={15} fw={600} c="text.6">
          {children}
        </Text>
      </Group>
      {aside}
    </Group>
  );
}
