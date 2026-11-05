// One card of the Setup sheet - Fork, Shock or Tyres - its name in a header bar across the top.
// The app's card surface, so Setup reads like every other page.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";

// The controls were drawn for a phone's card; a wider card centres them rather than spreading them.
const CONTROLS_MAX_WIDTH = 420;

interface SetupSectionProps {
  title: string;
  // Beside the name, dimmed: the mounted part, or what the card is for.
  subtitle?: string | null;
  children: ReactNode;
}

export function SetupSection({ title, subtitle, children }: SetupSectionProps): ReactElement {
  return (
    <Paper
      radius="lg"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="sm"
        px="md"
        py="sm"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <Text fz={15} fw={600} c="text.6" style={{ flexShrink: 0 }}>
          {title}
        </Text>
        {subtitle && (
          <Text fz={12} c="var(--color-text-dim)" ta="right" lineClamp={1}>
            {subtitle}
          </Text>
        )}
      </Group>
      <Box p="md">
        <Stack gap="sm" maw={CONTROLS_MAX_WIDTH} mx="auto">
          {children}
        </Stack>
      </Box>
    </Paper>
  );
}
