// What the phone and the desktop chat share: the thread, the draft and the bike it is about.
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { useChatThread } from "@/features/chat/chat.queries";
import type { ChatMessage } from "@/features/chat/chat.types";
import { useChatTurn, type ChatFailure, type PendingTurn } from "@/features/chat/useChatTurn";

export interface ChatPage {
  garage: Bike[];
  messages: ChatMessage[] | undefined;
  isLoading: boolean;
  isError: boolean;
  draft: string;
  setDraft: (draft: string) => void;
  pending: PendingTurn | null;
  failed: ChatFailure | null;
  selectedBikeId: number | null;
  selectBike: (next: number | null) => void;
  send: () => void;
  // What is actually stored, which is the only thing deleting the thread can reach.
  storedCount: number;
  turnCount: number;
}

// A bike id the user cannot have typed by hand reads as no selection, the same as in the
// service history, so junk in the URL never reaches the API as a bike.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function useChatPage(): ChatPage {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const { data: messages, isLoading, isError } = useChatThread();
  const [draft, setDraft] = useState("");
  // A turn that produced nothing puts its question back where it was typed.
  const restoreQuestion = useCallback((question: string): void => setDraft(question), []);
  const { pending, failed, ask } = useChatTurn(restoreQuestion);

  const garage = bikes ?? [];
  // The selection lives in the URL alone, as it does in the history: /chat?bike=12 is the way
  // in from a bike, and the More sheet opens the bare path, which drops it.
  const fromUrl = parseBikeId(searchParams.get("bike"));
  // An id no bike of theirs answers to reads as all bikes. A garage of one has nothing to
  // widen to, so its single bike is the selection whether the URL says so or not.
  const selectedBikeId = garage.some((bike) => bike.id === fromUrl)
    ? fromUrl
    : garage.length === 1
      ? garage[0].id
      : null;

  const storedCount = messages?.length ?? 0;
  const turnCount = storedCount + (pending === null ? 0 : 1);

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

  return {
    garage,
    messages,
    isLoading,
    isError,
    draft,
    setDraft,
    pending,
    failed,
    selectedBikeId,
    selectBike,
    send,
    storedCount,
    turnCount,
  };
}
