// The thread itself: alternating turns, and one muted line while a turn is still being worked
// out. No cards and no tables - an answer is prose, so it is drawn as prose.
import type { ReactElement } from "react";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { toolStepKey } from "../toolStepLabels";
import type { ChatMessage } from "../aiChat.types";
import type { PendingTurn } from "../useChatTurn";

interface ChatThreadProps {
  messages: ChatMessage[];
  // The turn on the wire, drawn after the saved ones.
  pending: PendingTurn | null;
}

export function ChatThread({ messages, pending }: ChatThreadProps): ReactElement {
  return (
    <Stack gap={20}>
      {messages.map((message) =>
        message.role === "user" ? (
          <Question key={message.id} text={message.content} />
        ) : (
          <Answer key={message.id} text={message.content} />
        ),
      )}
      {pending !== null && (
        <>
          <Question text={pending.question} />
          {pending.answer === null ? <ProgressLine tool={pending.tool} /> : <Answer text={pending.answer} />}
        </>
      )}
    </Stack>
  );
}

// The user's turn sits right and tinted, so the two speakers are told apart by place.
function Question({ text }: { text: string }): ReactElement {
  return (
    <Box className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600/20 px-4 py-2">
      <Text size="sm" c="text.6" style={{ whiteSpace: "pre-wrap" }}>
        {text}
      </Text>
    </Box>
  );
}

// Bare text, so a long answer reads as one continuous sentence rather than a document.
function Answer({ text }: { text: string }): ReactElement {
  return (
    <Text size="sm" c="text.6" className="leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
      {text}
    </Text>
  );
}

// One line, not a checklist and not a skeleton: what the round started with, nothing else.
function ProgressLine({ tool }: { tool: string | null }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={8} wrap="nowrap">
      <Loader size={12} color="var(--color-text-dim)" />
      <Text size="xs" c="var(--color-text-dim)">
        {t(toolStepKey(tool))}
      </Text>
    </Group>
  );
}
