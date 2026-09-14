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
      {/* Mono and upper-case, as section headings are lettered across the app, so the section's
          name stands apart from the Inter labels of the fields inside the card. */}
      <Text className="font-mono" fz={13} fw={500} tt="uppercase" lts="0.08em" c="text.6" px="xs">
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
