import type { Tool, ToolCallOptions } from 'ai';

// The envelope every list tool hands the model. `total_count` is always there, so a figure can
// be told truthfully without reading every row; no `next_cursor` means the end.
export interface ToolPage<Row> {
  rows: Row[];
  total_count: number;
  // How long the list is with nothing narrowed. Only on an empty narrowed page, so a filter that
  // matched nothing cannot read like a user who owns nothing.
  unfiltered_count?: number;
  truncated?: true;
  next_cursor?: string;
}

// A tool of this domain at the type it actually has: it always executes and always answers with
// a page. The narrow signature comes first on purpose - that is the one a call resolves to.
export type PageTool<Input, Row> = {
  execute: (input: Input, options: ToolCallOptions) => Promise<ToolPage<Row>>;
} & Tool<Input, ToolPage<Row>>;

// Whether the model narrowed the list at all. One rule for every tool; `cursor` is paging rather
// than a filter, so it does not count.
export function narrowed(input: object): boolean {
  return Object.entries(input).some(([key, value]) => key !== 'cursor' && value !== undefined);
}

// What an empty answer owes the model. The second read happens only on an empty filtered page,
// so the ordinary answer costs nothing extra.
export async function withUnfilteredCount<Row>(
  page: ToolPage<Row>,
  isNarrowed: boolean,
  countAll: () => Promise<number>,
): Promise<ToolPage<Row>> {
  if (page.rows.length > 0 || !isNarrowed) return page;

  return { ...page, unfiltered_count: await countAll() };
}
