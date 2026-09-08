import type { ReactElement } from "react";
import { ActionIcon, Box, Group, Loader, Menu, Stack, Text, Textarea } from "@mantine/core";
import { History, Send } from "lucide-react";
import { ANSWER, QUESTION, STEPS, SUGGESTIONS, THREADS } from "./mock";

// PROTOTYPE ONLY - Variant A: classic message thread. Answer is prose, tool work is one
// muted line, history hides behind a header menu. Closest to what people expect from a chat.

export const NAME = "Vlákno";

export function VariantA(): ReactElement {
  const running = STEPS.find((step) => !step.done);

  return (
    <Stack gap={0} h="100%" px={16} pb={96}>
      <Group justify="space-between" pt={8} pb={16}>
        <Text className="font-semibold">Mechanik</Text>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" c="var(--color-text-dim)" aria-label="historie">
              <History size={20} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {THREADS.map((thread) => (
              <Menu.Item key={thread.title}>
                <Text size="sm" lineClamp={1}>
                  {thread.title}
                </Text>
                <Text size="xs" c="var(--color-text-dim)" className="font-mono">
                  {thread.when}
                </Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Stack gap={20} className="flex-1 overflow-y-auto">
        {/* User turn sits right, tinted; the assistant turn is bare text so long answers read as prose. */}
        <Box className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600/20 px-4 py-2">
          <Text size="sm">{QUESTION}</Text>
        </Box>

        <Stack gap={8}>
          <Group gap={8} wrap="nowrap">
            {running ? <Loader size={12} color="var(--color-text-dim)" /> : null}
            <Text size="xs" c="var(--color-text-dim)">
              {running ? `${running.label}…` : "Hotovo"}
            </Text>
          </Group>
          <Text size="sm" className="leading-relaxed">
            {ANSWER}
          </Text>
        </Stack>
      </Stack>

      <Stack gap={8} pt={12}>
        <Group gap={6} wrap="nowrap" className="overflow-x-auto">
          {SUGGESTIONS.map((suggestion) => (
            <Box
              key={suggestion}
              className="shrink-0 rounded-full border border-gray-720 bg-cards-600/30 px-3 py-1"
            >
              <Text size="xs" c="var(--color-text-dim)" className="whitespace-nowrap">
                {suggestion}
              </Text>
            </Box>
          ))}
        </Group>
        <Group gap={8} wrap="nowrap">
          <Textarea placeholder="Zeptej se na cokoliv…" autosize minRows={1} maxRows={4} className="flex-1" />
          <ActionIcon size={38} radius="xl" aria-label="odeslat">
            <Send size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Stack>
  );
}
