// The thread itself: alternating turns, and one muted line while a turn is still being worked
// out. No cards and no tables - an answer is prose, so it is drawn as prose.
import { Fragment, type ReactElement } from "react";
import { Box, Divider, Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { toolStepKey } from "../toolStepLabels";
import type { ChatMessage } from "../aiChat.types";
import type { PendingTurn } from "../useChatTurn";

interface ChatThreadProps {
  messages: ChatMessage[];
  // The garage, so the bike a turn was asked about can be read back as a name.
  bikes: Bike[];
  // The turn on the wire, drawn after the saved ones.
  pending: PendingTurn | null;
}

export function ChatThread({ messages, bikes, pending }: ChatThreadProps): ReactElement {
  const { t } = useTranslation();
  // What the thread was about when the last saved message was written, which is what the turn
  // on the wire is compared against.
  const subject = messages.length === 0 ? null : messages[messages.length - 1].bike_id;

  return (
    <Stack gap={20}>
      {messages.map((message, index) => {
        // The message before it is the one it changed the subject from.
        const changed = index > 0 && message.bike_id !== messages[index - 1].bike_id;

        return (
          <Fragment key={message.id}>
            {changed && <SubjectDivider label={bikeLabel(bikes, message.bike_id, t)} />}
            {message.role === "user" ? <Question text={message.content} /> : <Answer text={message.content} />}
          </Fragment>
        );
      })}
      {pending !== null && (
        <>
          {messages.length > 0 && pending.bikeId !== subject && (
            <SubjectDivider label={bikeLabel(bikes, pending.bikeId, t)} />
          )}
          <Question text={pending.question} />
          {pending.answer === null ? (
            <ProgressLine tool={pending.tool} recovering={pending.recovering} />
          ) : (
            <Answer text={pending.answer} />
          )}
        </>
      )}
    </Stack>
  );
}

// The bike a turn was asked about, by the name the garage gives it. An id no bike of the
// user's answers to - an archived one among them - reads as all bikes, as the picker does.
function bikeLabel(bikes: Bike[], bikeId: number | null, t: TFunction): string {
  const bike = bikeId === null ? undefined : bikes.find((candidate) => candidate.id === bikeId);

  return bike === undefined ? t("service.allBikes") : bikeTitle(bike);
}

// Where the thread changed subject. It names what follows it, never what came before: the
// turns under it are the ones asked about this bike.
function SubjectDivider({ label }: { label: string }): ReactElement {
  return (
    <Divider
      color="var(--mantine-color-inputs-5)"
      labelPosition="center"
      label={
        <Text fz={12} c="var(--color-text-dim)">
          {label}
        </Text>
      }
    />
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

// One line, not a checklist and not a skeleton: what the round started with, nothing else -
// or, once the connection is gone, that the thread is being read for the answer instead. The
// loader stays either way: the turn is still being waited for, only somewhere else.
function ProgressLine({ tool, recovering }: { tool: string | null; recovering: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={8} wrap="nowrap">
      <Loader size={12} color="var(--color-text-dim)" />
      <Text size="xs" c="var(--color-text-dim)">
        {recovering ? t("chat.reconnecting") : t(toolStepKey(tool))}
      </Text>
    </Group>
  );
}
