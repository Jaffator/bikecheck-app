// Chat API requests. The thread is an ordinary JSON GET; the question is not - it is answered
// on a held connection, so its body is read by hand rather than through apiFetch.
import { apiFetch, apiFetchStream } from "@/api/client";
import type { ChatMessage, ChatStreamEvent, ChatThreadDeleted } from "./aiChat.types";

// The longest question the backend accepts.
export const QUESTION_MAX_LENGTH = 2000;

export async function getChatThread(): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>("/ai-chat/thread");
}

// DELETE /ai-chat/thread - throws the whole thread away, for good. There is nothing to
// revoke first and nothing to restore: hard deletion is what "delete my chat" has to mean.
export async function deleteChatThread(): Promise<ChatThreadDeleted> {
  return apiFetch<ChatThreadDeleted>("/ai-chat/thread", { method: "DELETE" });
}

// One question, answered while the caller holds the line. Every line of the NDJSON body is
// handed to `onEvent` as it arrives, so a progress line reads as progress. `bikeId` is what the
// picker had bound when send was pressed - null is all bikes, and the field is left out.
export async function askChat(
  question: string,
  bikeId: number | null,
  onEvent: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await apiFetchStream("/ai-chat", {
    method: "POST",
    body: JSON.stringify(bikeId === null ? { question } : { question, bike_id: bikeId }),
    signal,
  });
  if (response.body === null) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // A chunk can end mid-line, so what is left over waits here for the rest of its line.
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      emitLine(buffer.slice(0, newline), onEvent);
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }

  // A last line the server did not terminate is still a line.
  emitLine(buffer, onEvent);
}

// One line of NDJSON. The shape is the controller's contract, which the client cannot check.
function emitLine(line: string, onEvent: (event: ChatStreamEvent) => void): void {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;

  onEvent(JSON.parse(trimmed) as ChatStreamEvent);
}
