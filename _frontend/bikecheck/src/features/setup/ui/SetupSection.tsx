// One section of the Setup sheet - Tyres, Fork or Shock - a heading standing above its card.
// The same panel the bike's build is drawn on, so the page reads as one kind of surface.
import type { ReactElement, ReactNode } from "react";
import { Paper, Stack, Text } from "@mantine/core";

interface SetupSectionProps {
  title: string;
  children: ReactNode;
}

export function SetupSection({ title, children }: SetupSectionProps): ReactElement {
  return (
    <Stack gap="xs">
      {/* Upper-case and tracked, as section headings are lettered across the app, so the
          section's name stands apart from the field labels inside the card. */}
      <Text className="tabular-nums" fz={13} fw={500} tt="uppercase" lts="var(--tracking-label)" c="text.6" px="xs">
        {title}
      </Text>
      <Paper
        radius="lg"
        p="md"
        style={{
          backgroundColor: "var(--mantine-color-background-8)",
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
