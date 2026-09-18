// PROTOTYPE #121 / #128 — the dashboard card (round 1's B): two big figures once sharing
// is on. Never leaves the dashboard. The heading row opens the drawer; the Sledující and
// Žádosti figures lead to the followers tab of /follows (#124). OFF collapses to one row
// that leads to /follows too - following others works with a profile switched off.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Globe, Users } from "lucide-react";
import { usePrototypeStore, statsFor, useStats, VISIBILITY_LABEL } from "./prototype.store";
import { EYEBROW, PANEL, STATE_COLOR } from "./shared";

// Which figures are a way somewhere: the people ones. Views is a count, nothing to open.
const LINKED_FIGURES = new Set(["Sledující", "Žádosti"]);

export function DashboardShareCard(): ReactElement {
  const visibility = usePrototypeStore((state) => state.visibility);
  const stats = useStats();
  const open = usePrototypeStore((state) => state.openDrawer);
  const navigate = useNavigate();

  if (visibility === "OFF") {
    return (
      <UnstyledButton onClick={() => navigate("/follows")} className="active:scale-[0.985]" style={{ display: "block" }}>
        <Paper radius="lg" px="md" py="sm" style={{ ...PANEL, boxShadow: "var(--elev-row)" }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Users size={18} color="var(--mantine-color-primary-6)" />
              <Text fw={600} fz={15} c="text.6">
                Sledování
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
    <Paper radius="lg" p="md" style={PANEL}>
      <Stack gap="sm">
        {/* The heading is the drawer's handle; the figures below are each their own way. */}
        <UnstyledButton onClick={open} style={{ display: "block" }}>
          <Group justify="space-between" wrap="nowrap">
            <Text {...EYEBROW}>Garáž · {VISIBILITY_LABEL[visibility]}</Text>
            {visibility === "PUBLIC" ? <Globe size={16} color={color} /> : <Users size={16} color={color} />}
          </Group>
        </UnstyledButton>
        <Group gap={0} grow>
          {figures.map((figure) => {
            const linked = LINKED_FIGURES.has(figure.label);
            const body = (
              <Stack gap={0}>
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
                <Group gap={2} wrap="nowrap">
                  <Text {...EYEBROW}>{figure.label}</Text>
                  {linked && <ChevronRight size={12} color="var(--color-text-dim)" />}
                </Group>
              </Stack>
            );
            if (!linked) return <div key={figure.label}>{body}</div>;
            return (
              <UnstyledButton
                key={figure.label}
                className="active:scale-[0.97]"
                onClick={() => navigate("/follows?tab=followers")}
                style={{ display: "block" }}
              >
                {body}
              </UnstyledButton>
            );
          })}
        </Group>
      </Stack>
    </Paper>
  );
}
