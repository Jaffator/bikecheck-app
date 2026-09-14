// Chat page. One thread per user, a question typed at the bottom, and one muted line while the
// answer is worked out. The bike bar rides on the composer and says what a question is about
// before it is sent.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Box, Skeleton, Stack, Text } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeFilterChips } from "@/features/service/ui/BikeFilterChips";
import { useChatThread } from "@/features/chat/chat.queries";
import { useChatTurn } from "@/features/chat/useChatTurn";
import { ChatThread } from "@/features/chat/ui/ChatThread";
import { ChatComposer } from "@/features/chat/ui/ChatComposer";
import { ChatActionsMenu } from "@/features/chat/ui/ChatActionsMenu";
import { EmptyChat } from "./EmptyChat";

// Room for the composer, which floats and so keeps nothing clear of itself. The bike bar
// rides on it, so its row is part of the gap.
const COMPOSER_ROOM = "calc(15rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// The app header's height - see AppLayout, which the empty page measures itself from.
const HEADER_OFFSET = "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";

// With nothing in the thread there is nothing to scroll, so the page is held to exactly the
// space between the header and the composer and the empty state is centred in it.
const EMPTY_PAGE_HEIGHT = `calc(100dvh - ${HEADER_OFFSET} - ${COMPOSER_ROOM})`;

// A bike id the user cannot have typed by hand reads as no selection, the same as in the
// service history, so junk in the URL never reaches the API as a bike.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function Chat(): ReactElement {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const { data: messages, isLoading, isError } = useChatThread();
  const [draft, setDraft] = useState("");
  // A turn that produced nothing puts its question back where it was typed.
  const restoreQuestion = useCallback((question: string): void => setDraft(question), []);
  const { pending, failed, ask } = useChatTurn(restoreQuestion);

  const garage = bikes ?? [];
  // The selection lives in the URL alone, as it does in the history: /chat?bike=12 is the way
  // in from a bike, and switching tab drops it because the tab bar navigates to the bare path.
  const fromUrl = parseBikeId(searchParams.get("bike"));
  // An id no bike of theirs answers to reads as all bikes. A garage of one has nothing to
  // widen to, so its single bike is the selection whether the URL says so or not.
  const selectedBikeId = garage.some((bike) => bike.id === fromUrl)
    ? fromUrl
    : garage.length === 1
      ? garage[0].id
      : null;

  // What is actually stored, which is the only thing deleting the thread can reach.
  const storedCount = messages?.length ?? 0;
  const turnCount = storedCount + (pending === null ? 0 : 1);
  // A page with no turns on it takes its height from the viewport rather than its content.
  const empty = !isLoading && !isError && turnCount === 0;

  // The newest turn is the one being read, so the thread stays at its foot.
  useEffect(() => {
    if (turnCount === 0) return;
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [turnCount, pending?.answer]);

  // A chip changes what the next question is about and nothing else: nothing is written until
  // the question is sent.
  function selectBike(next: number | null): void {
    const params = new URLSearchParams(searchParams);
    if (next === null) {
      params.delete("bike");
    } else {
      params.set("bike", String(next));
    }
    setSearchParams(params, { replace: true });
  }

  function send(): void {
    const question = draft.trim();
    if (question.length === 0) return;
    setDraft("");
    ask(question, selectedBikeId);
  }

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
        pt="md"
        pb={empty ? 0 : COMPOSER_ROOM}
        // The empty state takes the whole page between header and composer and centres itself.
        style={
          empty
            ? {
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }
            : undefined
        }
      >
        {isLoading && (
          <Stack gap="md">
            {[0, 1].map((row) => (
              <Skeleton key={row} h={72} radius="md" />
            ))}
          </Stack>
        )}
        {isError && <Text c="red">{t("chat.loadFailed")}</Text>}
        {empty && <EmptyChat />}
        {!isLoading && !isError && turnCount > 0 && (
          <ChatThread messages={messages ?? []} bikes={garage} pending={pending} />
        )}
      </Box>
      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSend={send}
        running={pending !== null}
        failed={failed}
        actions={<ChatActionsMenu canClear={storedCount > 0} disabled={pending !== null} />}
        chips={
          garage.length === 0 ? undefined : (
            // A garage of one has no all-bikes chip: there is nothing else to ask about.
            <BikeFilterChips
              bikes={garage}
              selected={selectedBikeId}
              onSelect={selectBike}
              withAllBikes={garage.length > 1}
              opaque
            />
          )
        }
      />
    </Box>
  );
}
