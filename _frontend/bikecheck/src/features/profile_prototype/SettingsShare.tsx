// PROTOTYPE #121 — Settings: the state written beside the name (round 1's C badge), and one
// row under the Strava card that opens the drawer. No inline control - the drawer is the
// one place sharing is set.
import type { ReactElement } from "react";
import { Card, Group, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, Globe, Users } from "lucide-react";
import { usePrototypeStore, VISIBILITY_LABEL } from "./prototype.store";
import { STATE_COLOR } from "./shared";

// Settings' own rhythm (ROW_GAP_HALF).
const ROW = 10;

export function SettingsShareSection(): ReactElement {
  const visibility = usePrototypeStore((state) => state.visibility);
  const open = usePrototypeStore((state) => state.openDrawer);

  return (
    <Card
      bg="cards.6"
      className="mx-3 mb-3"
      px={0}
      py={ROW}
      radius="lg"
      style={{ border: "1px solid var(--mantine-color-inputs-5)" }}
    >
      <UnstyledButton onClick={open} className="w-full" px="md" py={ROW}>
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} fz={15} c="text.6">
            Nastavení sdílení
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Text fz={13} style={{ color: STATE_COLOR[visibility] }}>
              {VISIBILITY_LABEL[visibility]}
            </Text>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </Group>
      </UnstyledButton>
    </Card>
  );
}

// Under the name: icon and state. Nothing when OFF - a rider who shares nothing wears nothing.
export function ProfileNameBadge(): ReactElement | null {
  const visibility = usePrototypeStore((state) => state.visibility);
  if (visibility === "OFF") return null;
  const color = STATE_COLOR[visibility];

  return (
    <Group gap={4} wrap="nowrap" style={{ color }}>
      {visibility === "PUBLIC" ? <Globe size={13} /> : <Users size={13} />}
      <Text fz={12} fw={600} style={{ color: "inherit" }}>
        {VISIBILITY_LABEL[visibility]}
      </Text>
    </Group>
  );
}
