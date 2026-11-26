// What an empty Home card shows where its chart will go, the same in every card so empty cards read as one quiet pattern.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

const WELL_HEIGHT = 56;
const ICON_SIZE = 15;

export function EmptyWell({ icon: Icon, children }: { icon: LucideIcon; children: string }): ReactElement {
  return (
    <Group
      h={WELL_HEIGHT}
      gap={8}
      justify="center"
      wrap="nowrap"
      px="md"
      style={{ borderRadius: 12, backgroundColor: "var(--color-surface-well)" }}
    >
      <Icon size={ICON_SIZE} strokeWidth={1.8} color="var(--mantine-color-text-8)" aria-hidden style={{ flexShrink: 0 }} />
      <Text fz={13} c="text.8" ta="center">
        {children}
      </Text>
    </Group>
  );
}
