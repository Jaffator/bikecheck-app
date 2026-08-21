import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";

interface StatusBadgeProps {
  label: string;
}

// Renders the reusable empty-state status pill.
export function StatusBadge({ label }: StatusBadgeProps): ReactElement {
  return (
    <Group
      gap={8}
      p={8}
      bg="var(--color-surface)"
      className="rounded backdrop-blur-[2px]"
      style={{ border: "1px solid var(--color-border-solid)" }}
    >
      <Box w={8} h={8} bg="var(--color-status-idle)" className="rounded-full" />
      <Text className="font-mono" fz={10} lh="15px" w="auto" ta="center" c="var(--color-text-dim)">
        {label}
      </Text>
    </Group>
  );
}
