// Chat page. One thread per user, a question typed at the bottom, and one muted line while
// the answer is worked out. The bike bar above the thread says what a question is about
// before it is sent.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Box, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeFilterChips } from "@/features/service/ui/BikeFilterChips";
import { useChatThread } from "@/features/ai_chat/aiChat.queries";
import { useChatTurn } from "@/features/ai_chat/useChatTurn";
import { ChatThread } from "@/features/ai_chat/ui/ChatThread";
import { ChatComposer } from "@/features/ai_chat/ui/ChatComposer";
import { ClearThreadButton } from "@/features/ai_chat/ui/ClearThreadButton";
import { EmptyChat } from "./EmptyChat";

// Room for the composer, which floats and so keeps nothing clear of itself.
const COMPOSER_ROOM = "calc(11rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// Where the bar comes to rest: the app header's height - see AppLayout, and the month
// headings of the service history, which hold at the same line.
const HEADER_OFFSET = "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";

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

  // The newest turn is the one being read, so the thread stays at its foot.
  useEffect(() => {
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
    <>
      {(garage.length > 0 || storedCount > 0) && (
        // The bar holds under the header while the thread scrolls past it, and carries the
        // page background so the turns pass under it rather than through it.
        <Box
          style={{
            position: "sticky",
            top: HEADER_OFFSET,
            zIndex: 1,
            backgroundColor: "var(--mantine-color-background-9)",
          }}
        >
          <Group gap={0} wrap="nowrap" align="center">
            {garage.length > 0 && (
              // Takes the bar and scrolls inside itself, so the chips never push the bin off.
              <Box style={{ flex: 1, minWidth: 0 }}>
                {/* A garage of one has no all-bikes chip: there is nothing else to ask about. */}
                <BikeFilterChips
                  bikes={garage}
                  selected={selectedBikeId}
                  onSelect={selectBike}
                  withAllBikes={garage.length > 1}
                />
              </Box>
            )}
            {/* Far from the composer, at the end of the bar: the thread is deleted from where
                the thread is described, never from beside the button that adds to it. */}
            {storedCount > 0 && (
              <Box ml="auto" mr="md" py={4}>
                <ClearThreadButton disabled={pending !== null} />
              </Box>
            )}
          </Group>
        </Box>
      )}
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
        {!isLoading && !isError && turnCount > 0 && (
          <ChatThread messages={messages ?? []} bikes={garage} pending={pending} />
        )}
      </Box>
      <ChatComposer value={draft} onChange={setDraft} onSend={send} running={pending !== null} failed={failed} />
    </>
  );
}
