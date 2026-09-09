import type { Tool, ToolCallOptions } from 'ai';

// The envelope every tool that returns a list hands the model. `total_count` is always there,
// so the model can tell the truth about a figure even when it has not read every row; the
// absence of `next_cursor` means the end.
export interface ToolPage<Row> {
  rows: Row[];
  total_count: number;
  truncated?: true;
  next_cursor?: string;
}

// A tool of this domain, at the type it actually has: it always executes, and it always
// answers with a page. The SDK's own type allows a missing execute and an async iterable,
// neither of which any tool here does - saying so keeps the callers free of casts.
// The narrow signature comes first on purpose: that is the one a call resolves to.
export type PageTool<Input, Row> = {
  execute: (input: Input, options: ToolCallOptions) => Promise<ToolPage<Row>>;
} & Tool<Input, ToolPage<Row>>;
