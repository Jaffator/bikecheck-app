// One section of the Setup sheet - Tyres, Fork or Shock - as a card carrying its own heading.
// The same panel the bike's build is drawn on, so the page reads as one kind of surface.
import type { ReactElement, ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";

interface SetupSectionProps {
  title: string;
  children: ReactNode;
}

export function SetupSection({ title, children }: SetupSectionProps): ReactElement {
  return (
    <Paper
      radius="lg"
      style={{
        backgroundColor: "var(--mantine-color-background-8)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Group gap={8} wrap="nowrap" px="md" pt="md" pb="xs" c="text.6">
        {/* Mono and upper-case, as section headings are lettered across the app, so the card's
            name stands apart from the Inter labels of the fields inside it. */}
        <Text className="font-mono" fz={13} fw={500} tt="uppercase" lts="0.08em" c="text.6">
          {title}
        </Text>
      </Group>
      <Stack gap="sm" px="md" pb="md">
        {children}
      </Stack>
    </Paper>
  );
}
