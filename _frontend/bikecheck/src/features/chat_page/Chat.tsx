// Chat page. One thread per user, a question typed at the bottom, and one muted line while the
// answer is worked out. The bike bar rides on the composer and says what a question is about
// before it is sent.
import { useEffect, type ReactElement } from "react";
import { Box } from "@mantine/core";
import { ChatComposer } from "@/features/chat/ui/ChatComposer";
import { ChatActionsMenu } from "@/features/chat/ui/ChatActionsMenu";
import { useIsDesktop } from "@/layout/breakpoints";
import { ChatBikeChips, ChatBody } from "./ChatBody";
import { ChatDesktop } from "./ChatDesktop";
import { useChatPage } from "./useChatPage";

// Room for the composer, which floats and so keeps nothing clear of itself. The bike bar
// rides on it, so its row is part of the gap.
const COMPOSER_ROOM = "calc(9rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// The app header's height - see AppLayout, which the empty page measures itself from.
const HEADER_OFFSET = "calc(3rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";

// With nothing in the thread there is nothing to scroll, so the page is held to exactly the
// space between the header and the composer.
const EMPTY_PAGE_HEIGHT = `calc(100dvh - ${HEADER_OFFSET} - ${COMPOSER_ROOM})`;

export function Chat(): ReactElement {
  const isDesktop = useIsDesktop();
  return isDesktop ? <ChatDesktop /> : <ChatPhone />;
}

function ChatPhone(): ReactElement {
  const page = useChatPage();
  const { isLoading, isError, turnCount, pending } = page;
  // A page with no turns on it takes its height from the viewport rather than its content.
  const empty = !isLoading && !isError && turnCount === 0;

  // The newest turn is the one being read, so the thread stays at its foot.
  useEffect(() => {
    if (turnCount === 0) return;
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [turnCount, pending?.answer]);

  return (
    <Box
      style={
        empty
          ? {
              height: EMPTY_PAGE_HEIGHT,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <Box
        px="md"
        // The empty state carries its own offset from the header, so the page adds none.
        pt={empty ? 0 : "md"}
        pb={empty ? 0 : COMPOSER_ROOM}
      >
        <ChatBody page={page} />
      </Box>
      <ChatComposer
        value={page.draft}
        onChange={page.setDraft}
        onSend={page.send}
        running={pending !== null}
        failed={page.failed}
        actions={<ChatActionsMenu canClear={page.storedCount > 0} disabled={pending !== null} />}
        chips={page.garage.length === 0 ? undefined : <ChatBikeChips page={page} />}
      />
    </Box>
  );
}
