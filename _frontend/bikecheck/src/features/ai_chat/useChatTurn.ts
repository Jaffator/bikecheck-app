// One question on the wire, and the thread's view of it while it is there.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { askChat } from "./aiChat.api";
import { CHAT_THREAD_KEY } from "./aiChat.queries";
import type { ChatErrorReason, ChatStreamEvent } from "./aiChat.types";

// The turn being answered right now. It is in the thread but not yet in the database, so it
// is held here instead of in the query cache.
export interface PendingTurn {
  question: string;
  // The tool the current round started with; null until the first step arrives.
  tool: string | null;
  // The answer as it arrived, shown while the saved thread is fetched back.
  answer: string | null;
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
  ask: (question: string) => void;
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

  // Leaving the page drops the connection. The turn is saved either way.
  useEffect(() => {
    return () => connection.current?.abort();
  }, []);

  const ask = useCallback(
    (question: string): void => {
      if (running.current) return;
      running.current = true;
      setFailed(null);
      setPending({ question, tool: null, answer: null });

      const controller = new AbortController();
      connection.current = controller;

      let failure: ChatFailure | null = null;
      let answered = false;

      function onEvent(event: ChatStreamEvent): void {
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

      void askChat(question, onEvent, controller.signal)
        .catch(() => {
          failure = { reason: "failed", retryAt: null };
        })
        .then(async () => {
          running.current = false;
          // The page is gone; there is nothing left to tell.
          if (controller.signal.aborted) return;
          if (!answered) {
            setPending(null);
            setFailed(failure ?? { reason: "failed", retryAt: null });
            onFailed(question);
            return;
          }
          // The saved pair replaces the local one, and only once it is here: the answer must
          // not blink out between the stream and the thread.
          await queryClient.invalidateQueries({ queryKey: CHAT_THREAD_KEY });
          setPending(null);
        });
    },
    [queryClient, onFailed],
  );

  return { pending, failed, ask };
}
