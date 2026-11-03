// Desktop chat: a column the window's height, the thread scrolling inside it over the composer,
// and questions to start from beside it.
import { useEffect, useRef, type ReactElement } from "react";
import { Box, Grid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChatActionsMenu } from "@/features/chat/ui/ChatActionsMenu";
import { ChatComposerInline } from "@/features/chat/ui/ChatComposer";
import { ChatSuggestions } from "@/features/chat/ui/ChatSuggestions";
import { ChatBikeChips, ChatBody } from "./ChatBody";
import { useChatPage } from "./useChatPage";

// The desktop header (24 + 40 + 4, see AppLayout) and the page's own 12 above and 32 below the
// column, so it ends at the window's foot and the page itself never scrolls.
const CARD_HEIGHT = "calc(100dvh - 112px - var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";


export function ChatDesktop(): ReactElement {
  const { t } = useTranslation();
  const page = useChatPage();
  const { turnCount, pending } = page;
  const threadRef = useRef<HTMLDivElement>(null);
  // The empty state keeps its own place from the top, as every empty page does.
  const empty = !page.isLoading && !page.isError && turnCount === 0;

  // The newest turn is the one being read, so the thread stays at its foot.
  useEffect(() => {
    const thread = threadRef.current;
    if (turnCount === 0 || thread === null) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [turnCount, pending?.answer]);

  return (
    // The header leaves 4px under its row; 12 more makes the page's 16px gap.
    <Box p="xl" pt={12}>
      {/* The same columns as Riders, so the chat lines up with its card. */}
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          {/* No card: the thread and composer sit on the page itself. */}
          <Box h={CARD_HEIGHT} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box ref={threadRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {/* Pushed to the foot, so a short thread sits over the composer as a long one does. */}
              <Box pt="lg" pb="xs" mt={empty ? 0 : "auto"}>
                <ChatBody page={page} />
              </Box>
            </Box>
            <Box pt="sm" pb="md">
              <ChatComposerInline
                value={page.draft}
                onChange={page.setDraft}
                onSend={page.send}
                running={pending !== null}
                failed={page.failed}
                actions={<ChatActionsMenu canClear={page.storedCount > 0} disabled={pending !== null} />}
                chips={page.garage.length === 0 ? undefined : <ChatBikeChips page={page} />}
              />
              <Text fz={11} c="text.8" px="sm" pt={8}>
                {t("chat.disclaimer")}
              </Text>
            </Box>
          </Box>
        </Grid.Col>
        {/* Under the chat it would sit below the window's foot, so a narrow window drops it. */}
        <Grid.Col span={4} visibleFrom="lg">
          <ChatSuggestions onPick={page.setDraft} />
        </Grid.Col>
      </Grid>
    </Box>
  );
}
