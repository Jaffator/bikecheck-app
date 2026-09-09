// One question on the wire, and the thread's view of it while it is there.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { askChat, getChatThread } from "./aiChat.api";
import { CHAT_THREAD_KEY } from "./aiChat.queries";
import type { ChatErrorReason, ChatMessage, ChatStreamEvent } from "./aiChat.types";

// How long the line may say nothing at all before it is taken for dead. The server sends a
// keepalive every ten seconds, so this is two of them missed - the gap between two tool rounds
// says nothing on its own, which is why the keepalive exists.
const SILENCE_LIMIT_MS = 25_000;

// How long the answer is waited for after the connection is gone, and how often the thread is
// asked for it. The loop kept running on the server, so the answer usually lands after the
// socket died: the window covers the minute the loop is allowed and the write at the end of it.
const RECOVERY_WINDOW_MS = 75_000;
const RECOVERY_INTERVAL_MS = 3_000;

// The turn being answered right now. It is in the thread but not yet in the database, so it
// is held here instead of in the query cache.
export interface PendingTurn {
  question: string;
  // The bike the picker had bound when the question went out; null is all bikes. The thread
  // reads it to know whether this turn changed the subject.
  bikeId: number | null;
  // The tool the current round started with; null until the first step arrives.
  tool: string | null;
  // The answer as it arrived, shown while the saved thread is fetched back.
  answer: string | null;
  // The connection is gone and the thread is being read for the answer it may already hold.
  // What the round was doing stops being news at that point, so the line says this instead.
  recovering: boolean;
}

// Why the last turn produced nothing, so the page can say so beside the send button. A
// refusal on the daily budget carries the moment the window frees up; nothing else does.
export interface ChatFailure {
  reason: ChatErrorReason;
  retryAt: string | null;
}

export interface ChatTurn {
  pending: PendingTurn | null;
  failed: ChatFailure | null;
  ask: (question: string, bikeId: number | null) => void;
}

// A turn is started, watched and settled here. `onFailed` hands the question back, because a
// half turn is no turn: nothing was saved, so it belongs in the input rather than the thread.
export function useChatTurn(onFailed: (question: string) => void): ChatTurn {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [failed, setFailed] = useState<ChatFailure | null>(null);
  // Read synchronously, so mashing send cannot put a second question on the wire.
  const running = useRef(false);
  const connection = useRef<AbortController | null>(null);
  // Whether there is still a page to tell anything to. It is what separates a connection
  // dropped by leaving the page from one dropped under a page that is still open.
  const alive = useRef(true);
  const { isOnline } = useNetworkStatus();

  // Leaving the page drops the connection. The turn is saved either way.
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      connection.current?.abort();
    };
  }, []);

  // Losing the network does not fail the read, it hangs it - measured on the device, see #76.
  // So the status is what ends the wait; the read itself would never come back.
  useEffect(() => {
    if (!isOnline) connection.current?.abort();
  }, [isOnline]);

  const ask = useCallback(
    (question: string, bikeId: number | null): void => {
      if (running.current) return;
      running.current = true;
      setFailed(null);
      setPending({ question, bikeId, tool: null, answer: null, recovering: false });

      const controller = new AbortController();
      connection.current = controller;
      // The newest message before the question went out, which is how a turn that reached the
      // thread without us is recognised afterwards.
      const before = newestMessageId(queryClient.getQueryData<ChatMessage[]>(CHAT_THREAD_KEY));

      let failure: ChatFailure | null = null;
      let answered = false;
      let silence: ReturnType<typeof setTimeout> | undefined;

      // Anything at all on the line - a step, a keepalive - is proof it is still there.
      function heard(): void {
        clearTimeout(silence);
        silence = setTimeout(() => controller.abort(), SILENCE_LIMIT_MS);
      }

      function onEvent(event: ChatStreamEvent): void {
        heard();
        if (event.type === "ping") return;
        if (event.type === "step") {
          setPending((turn) => (turn === null ? turn : { ...turn, tool: event.tool }));
          return;
        }
        if (event.type === "error") {
          failure = { reason: event.reason, retryAt: event.retry_at ?? null };
          return;
        }
        answered = true;
        setPending((turn) => (turn === null ? turn : { ...turn, answer: event.message.content }));
      }

      heard();

      void askChat(question, bikeId, onEvent, controller.signal)
        // A read that fails is the connection, not the turn: what the turn did is in `failure`.
        .catch(() => undefined)
        .then(async () => {
          clearTimeout(silence);
          // The page is gone; there is nothing left to tell.
          if (!alive.current) {
            running.current = false;
            return;
          }

          if (answered) {
            // The saved pair replaces the local one, and only once it is here: the answer must
            // not blink out between the stream and the thread.
            await queryClient.invalidateQueries({ queryKey: CHAT_THREAD_KEY });
          } else if (failure !== null) {
            // The server said why. It wrote nothing, so there is nothing to look for.
            setFailed(failure);
            onFailed(question);
          } else {
            // Nothing said why, so the line went rather than the turn: the loop is still
            // running on the server and the answer may reach the thread on its own.
            setPending((turn) => (turn === null ? turn : { ...turn, recovering: true }));
            const thread = await recoverThread(before, alive);
            if (thread !== null) {
              queryClient.setQueryData(CHAT_THREAD_KEY, thread);
            } else if (alive.current) {
              setFailed({ reason: "failed", retryAt: null });
              onFailed(question);
            }
          }

          if (alive.current) setPending(null);
          running.current = false;
        });
    },
    [queryClient, onFailed],
  );

  return { pending, failed, ask };
}

// The thread, read again until the turn the connection dropped on shows up in it - the whole
// turn is one write, so a newer message than the last one seen is the answer having landed. A
// read that comes back without it is not a verdict: the loop was still running when it was
// asked. Only the window closing is, and then the question goes back to the input.
async function recoverThread(before: number, alive: { current: boolean }): Promise<ChatMessage[] | null> {
  const until = Date.now() + RECOVERY_WINDOW_MS;

  for (;;) {
    await wait(RECOVERY_INTERVAL_MS);
    if (!alive.current) return null;

    // Offline is not "the answer is not there", so a read that fails only spends the window.
    const thread = await getChatThread().catch(() => null);
    if (thread !== null && landed(thread, before)) return thread;

    if (Date.now() >= until) return null;
  }
}

// Whether the thread now ends in an answer newer than what was there before the question. Both
// messages of a turn are written together, so the assistant one being newest is the whole turn.
function landed(thread: ChatMessage[], before: number): boolean {
  if (thread.length === 0) return false;
  const newest = thread[thread.length - 1];

  return newest.id > before && newest.role === "assistant";
}

// The newest message the thread holds, or nothing at all. Ids only grow, so the newest one is
// the whole state a turn that landed later is compared against.
function newestMessageId(thread: ChatMessage[] | undefined): number {
  if (thread === undefined || thread.length === 0) return 0;

  return thread[thread.length - 1].id;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
