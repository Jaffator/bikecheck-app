import type { ResponseChatMessageDto } from './dto/response-chat-message.dto';

// What a held POST /ai-chat sends down the line, one JSON per line. A `step` says which tool
// the round started with and nothing else - the sentence is the frontend's, in the user's
// language. `done` carries the saved answer; `error` says why there is none.
export type ChatStreamEvent =
  | { type: 'step'; tool: string }
  | { type: 'done'; message: ResponseChatMessageDto }
  | { type: 'error'; reason: ChatErrorReason };

export type ChatErrorReason = 'timeout' | 'failed';

// How the loop reports progress. It never waits for the line to be taken: a dropped
// connection must not kill a turn the tool rounds have already been paid for.
export type EmitChatEvent = (event: ChatStreamEvent) => void;
