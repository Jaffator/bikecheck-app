// Backend ai-chat response types. The streamed route is written by hand: `gen:api` reads
// OpenAPI, which cannot describe a body delivered one line at a time.

export type ChatRole = "user" | "assistant";

// One turn of the thread as GET /ai-chat/thread returns it. What the model did to answer is
// never returned: the thread is what was said, not how it was found out.
export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  // The bike the picker had bound when the question was asked; a change between consecutive
  // turns is where the thread draws its divider. Null is all bikes.
  bike_id: number | null;
  created_at: string;
}

export type ChatErrorReason = "timeout" | "failed" | "budget";

// One line of the NDJSON body POST /ai-chat holds the connection open for. A `step` names
// the tool the round started with; the sentence is composed here, in the user's language.
// `retry_at` comes with `budget` alone: the moment the token window frees up, ISO.
export type ChatStreamEvent =
  | { type: "step"; tool: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; reason: ChatErrorReason; retry_at?: string };
