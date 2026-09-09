import type { ResponseChatMessageDto } from './dto/response-chat-message.dto';

// What a held POST /ai-chat sends down the line, one JSON per line. A `step` says which tool
// the round started with and nothing else - the sentence is the frontend's, in the user's
// language. `done` carries the saved answer; `error` says why there is none. `retry_at` is ISO
// and belongs to `budget` alone: the refusal names the moment the window frees up, and the
// sentence around that moment is the frontend's.
export type ChatStreamEvent =
  | { type: 'step'; tool: string }
  | { type: 'done'; message: ResponseChatMessageDto }
  | { type: 'error'; reason: ChatErrorReason; retry_at?: string };

export type ChatErrorReason = 'timeout' | 'failed' | 'budget';

// How the loop reports progress. It never waits for the line to be taken: a dropped
// connection must not kill a turn the tool rounds have already been paid for.
export type EmitChatEvent = (event: ChatStreamEvent) => void;
