// Chat page. One thread per user, a question typed at the bottom, and one muted line while
// the answer is worked out.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Box, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useChatThread } from "@/features/ai_chat/aiChat.queries";
import { useChatTurn } from "@/features/ai_chat/useChatTurn";
import { ChatThread } from "@/features/ai_chat/ui/ChatThread";
import { ChatComposer } from "@/features/ai_chat/ui/ChatComposer";
import { EmptyChat } from "./EmptyChat";

// Room for the composer, which floats and so keeps nothing clear of itself.
const COMPOSER_ROOM = "calc(11rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

export function Chat(): ReactElement {
  const { t } = useTranslation();
  const { data: messages, isLoading, isError } = useChatThread();
  const [draft, setDraft] = useState("");
  // A turn that produced nothing puts its question back where it was typed.
  const restoreQuestion = useCallback((question: string): void => setDraft(question), []);
  const { pending, failed, ask } = useChatTurn(restoreQuestion);

  const turnCount = (messages?.length ?? 0) + (pending === null ? 0 : 1);

  // The newest turn is the one being read, so the thread stays at its foot.
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [turnCount, pending?.answer]);

  function send(): void {
    const question = draft.trim();
    if (question.length === 0) return;
    setDraft("");
    ask(question);
  }

  return (
    <>
      <Box px="md" pt="md" pb={COMPOSER_ROOM}>
        {isLoading && (
          <Stack gap="md">
            {[0, 1].map((row) => (
              <Skeleton key={row} h={72} radius="md" />
            ))}
          </Stack>
        )}
        {isError && <Text c="red">{t("chat.loadFailed")}</Text>}
        {!isLoading && !isError && turnCount === 0 && <EmptyChat />}
        {!isLoading && !isError && turnCount > 0 && <ChatThread messages={messages ?? []} pending={pending} />}
      </Box>
      <ChatComposer value={draft} onChange={setDraft} onSend={send} running={pending !== null} failed={failed} />
    </>
  );
}
