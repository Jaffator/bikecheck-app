import type { ReactElement } from "react";
import { ActionIcon, Group, Progress, Stack, Text, Textarea } from "@mantine/core";
import { Check, Send } from "lucide-react";
import { PARTS, QUESTION, STEPS } from "./mock";

// PROTOTYPE ONLY - Variant B: the answer is one sentence plus real cards. Data never lives
// inside prose, so numbers stay scannable. Tool work is a visible checklist of steps.

export const NAME = "Karty";

export function VariantB(): ReactElement {
  const done = STEPS.filter((step) => step.done).length;

  return (
    <Stack gap={16} h="100%" px={16} pt={8} pb={96}>
      <Text size="sm" c="var(--color-text-dim)">
        {QUESTION}
      </Text>

      {/* The loop is shown as work, not as a spinner: each tool that ran is named with its row count. */}
      <Stack gap={6} className="rounded-2xl border border-gray-720 bg-cards-600/30 p-3">
        <Progress value={(done / STEPS.length) * 100} size={2} />
        {STEPS.map((step) => (
          <Group key={step.name} justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              {step.done ? <Check size={12} color="var(--color-text-dim)" /> : null}
              <Text size="xs" c={step.done ? "var(--color-text-dim)" : undefined}>
                {step.label}
              </Text>
            </Group>
            <Text size="xs" c="var(--color-text-dim)" className="font-mono">
              {step.done ? `${step.rows} řádků` : "…"}
            </Text>
          </Group>
        ))}
      </Stack>

      <Text size="sm">Poslední výměna byla 14. 5. 2026. Tady je celá historie řetězů:</Text>

      <Stack gap={8} className="flex-1 overflow-y-auto">
        {PARTS.map((part) => (
          <Group
            key={`${part.component_desc}-${part.mounted_at}`}
            justify="space-between"
            wrap="nowrap"
            className="rounded-2xl border border-gray-720 bg-cards-600/30 px-4 py-3"
          >
            <Stack gap={2}>
              {/* Name in Inter, metadata in mono - the card typography rule. */}
              <Text size="sm" className="font-semibold">
                {part.component_desc}
              </Text>
              <Text size="xs" c="var(--color-text-dim)" className="font-mono">
                {part.mounted_at} → {part.removed_at ?? "dosud"}
                {part.service_count === 0 ? " · servis nezaznamenán" : ` · ${part.service_count}× servis`}
              </Text>
            </Stack>
            <Stack gap={0} align="flex-end">
              <Text size="sm" className="font-mono">
                {part.distance_km} km
              </Text>
              <Text size="xs" c="var(--color-text-dim)">
                {part.status === "mounted" ? "nasazený" : "sundaný"}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>

      <Group gap={8} wrap="nowrap">
        <Textarea placeholder="Další otázka…" autosize minRows={1} maxRows={4} className="flex-1" />
        <ActionIcon size={38} radius="xl" aria-label="odeslat">
          <Send size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
