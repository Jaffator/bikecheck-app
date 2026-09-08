import type { ReactElement } from "react";
import { ActionIcon, Group, Skeleton, Stack, Text, TextInput } from "@mantine/core";
import { ArrowUp, RotateCcw } from "lucide-react";
import { ANSWER, PARTS, QUESTION, STEPS, THREADS } from "./mock";

// PROTOTYPE ONLY - Variant C: not a thread at all. The question bar owns the top, the answer
// fills the screen as one result panel, and older questions collapse into a stack below.
// Bets that people ask one-off questions rather than converse.

export const NAME = "Výsledek";

export function VariantC(): ReactElement {
  const running = STEPS.find((step) => !step.done);

  return (
    <Stack gap={16} h="100%" px={16} pt={8} pb={96}>
      {/* The input leads instead of trailing - the page reads as a query surface, not a chat. */}
      <Group gap={8} wrap="nowrap">
        <TextInput placeholder="Na co se ptáš?" className="flex-1" size="md" radius="xl" />
        <ActionIcon size={40} radius="xl" aria-label="zeptat se">
          <ArrowUp size={18} />
        </ActionIcon>
      </Group>

      <Stack gap={12} className="flex-1 overflow-y-auto">
        <Text size="lg" className="font-semibold leading-snug">
          {QUESTION}
        </Text>

        {running ? (
          // The panel shape is drawn before the answer lands, so the wait has a size.
          <Stack gap={8}>
            <Text size="xs" c="var(--color-text-dim)">
              {running.label}…
            </Text>
            <Skeleton height={14} radius="sm" />
            <Skeleton height={14} width="80%" radius="sm" />
            <Skeleton height={64} radius="lg" mt={8} />
          </Stack>
        ) : null}

        <Text size="sm" className="leading-relaxed">
          {ANSWER}
        </Text>

        {/* One inline strip of numbers, not a card list - the panel stays a single object. */}
        <Group gap={0} className="rounded-2xl border border-gray-720 bg-cards-600/30 divide-x divide-gray-720">
          {PARTS.slice(0, 3).map((part) => (
            <Stack key={part.mounted_at} gap={2} align="center" className="flex-1 px-2 py-3">
              <Text size="sm" className="font-mono">
                {part.distance_km}
              </Text>
              <Text size="xs" c="var(--color-text-dim)" className="font-mono">
                {part.mounted_at.slice(0, 7)}
              </Text>
            </Stack>
          ))}
        </Group>

        <Group gap={6}>
          <ActionIcon variant="subtle" size="sm" c="var(--color-text-dim)" aria-label="znovu">
            <RotateCcw size={14} />
          </ActionIcon>
          <Text size="xs" c="var(--color-text-dim)">
            3 tooly · 7 řádků
          </Text>
        </Group>

        {/* Older questions do not scroll above - they stack below as re-runnable entries. */}
        <Stack gap={4} pt={12}>
          <Text size="xs" c="var(--color-text-dim)" className="uppercase tracking-wide">
            Dřívější
          </Text>
          {THREADS.map((thread) => (
            <Group
              key={thread.title}
              justify="space-between"
              wrap="nowrap"
              className="rounded-xl border border-gray-720 px-3 py-2"
            >
              <Text size="xs" lineClamp={1}>
                {thread.title}
              </Text>
              <Text size="xs" c="var(--color-text-dim)" className="font-mono">
                {thread.when}
              </Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
