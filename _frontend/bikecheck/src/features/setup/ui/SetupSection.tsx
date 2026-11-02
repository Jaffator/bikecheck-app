// One section of the Setup sheet - Tyres, Fork or Shock - a heading standing above its card.
// The app's card surface, so Setup reads like every other page.
import type { ReactElement, ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";

interface SetupSectionProps {
  title: string;
  // Beside the heading, e.g. the profile menu.
  action?: ReactNode;
  children: ReactNode;
}

export function SetupSection({ title, action, children }: SetupSectionProps): ReactElement {
  return (
    <Stack gap="xs">
      {/* Upper-case and tracked, as section headings are lettered across the app, so the
          section's name stands apart from the field labels inside the card. */}
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text className="tabular-nums" fz={13} fw={500} tt="uppercase" lts="var(--tracking-label)" c="text.6" px="xs">
          {title}
        </Text>
        {action}
      </Group>
      <Paper
        radius="lg"
        p="md"
        style={{
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          border: "none",
          boxShadow: "var(--elev-panel)",
        }}
      >
        <Stack gap="sm">{children}</Stack>
      </Paper>
    </Stack>
  );
}
