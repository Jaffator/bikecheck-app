// PROTOTYPE #121 — the dashboard card (round 1's B): two big figures once sharing is on;
// OFF collapses to a one-line invitation. Never leaves the dashboard. Opens the drawer.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, Globe, Share2, Users } from "lucide-react";
import { usePrototypeStore, statsFor, VISIBILITY_LABEL } from "./prototype.store";
import { EYEBROW, PANEL, STATE_COLOR } from "./shared";

export function DashboardShareCard(): ReactElement {
  const visibility = usePrototypeStore((state) => state.visibility);
  const stats = usePrototypeStore((state) => state.stats);
  const open = usePrototypeStore((state) => state.openDrawer);

  if (visibility === "OFF") {
    return (
      <UnstyledButton onClick={open} className="active:scale-[0.985]" style={{ display: "block" }}>
        <Paper radius="lg" px="md" py="sm" style={{ ...PANEL, boxShadow: "var(--elev-row)" }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Share2 size={18} color="var(--mantine-color-primary-6)" />
              <Text fw={600} fz={15} c="text.6">
                Sdílej svou garáž
              </Text>
            </Group>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </Paper>
      </UnstyledButton>
    );
  }

  const color = STATE_COLOR[visibility];
  const figures = statsFor(visibility, stats);

  return (
    <UnstyledButton onClick={open} className="active:scale-[0.985]" style={{ display: "block" }}>
      <Paper radius="lg" p="md" style={PANEL}>
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Text {...EYEBROW}>Garáž · {VISIBILITY_LABEL[visibility]}</Text>
            {visibility === "PUBLIC" ? <Globe size={16} color={color} /> : <Users size={16} color={color} />}
          </Group>
          <Group gap={0} grow>
            {figures.map((figure) => (
              <Stack key={figure.label} gap={0}>
                {/* A waiting request is the one figure that asks for something, so it takes the accent. */}
                <Text
                  className="font-mono"
                  fz={32}
                  fw={700}
                  c={figure.label === "Žádosti" && figure.value > 0 ? "primary.5" : "text.6"}
                  style={{ lineHeight: 1.1 }}
                >
                  {figure.value}
                </Text>
                <Text {...EYEBROW}>{figure.label}</Text>
              </Stack>
            ))}
          </Group>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
