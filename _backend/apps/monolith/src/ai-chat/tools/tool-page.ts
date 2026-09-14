import type { Tool, ToolCallOptions } from 'ai';

// The envelope every list tool hands the model. `total_count` is always there, so a figure can
// be told truthfully without reading every row; no `next_cursor` means the end.
export interface ToolPage<Row> {
  rows: Row[];
  total_count: number;
  // How long the list is with nothing narrowed. Only on an empty narrowed page, so a filter that
  // matched nothing cannot read like a user who owns nothing.
  unfiltered_count?: number;
  // The filters were dropped and this is the whole list instead: what came back for them was
  // empty while the list itself is not. Words alone did not stop a model reading its own empty
  // page as a fact, so the page it gets is the one it should have asked for.
  filter_ignored?: true;
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

// What an empty answer owes the model. A filter that matched nothing is the model's own doing
// far more often than it is a fact about the user, so an empty narrowed page is not handed back:
// the unnarrowed list takes its place, marked as the swap it is. Only a list that is empty either
// way comes back empty, and then unfiltered_count: 0 says so outright.
//
// The second read happens on an empty narrowed page alone, so the ordinary answer costs nothing.
export async function withUnfilteredFallback<Row>(
  page: ToolPage<Row>,
  isNarrowed: boolean,
  unfiltered: () => Promise<ToolPage<Row>>,
): Promise<ToolPage<Row>> {
  if (page.rows.length > 0 || !isNarrowed) return page;

  const all = await unfiltered();
  if (all.total_count === 0) return { ...page, unfiltered_count: 0 };

  return { ...all, filter_ignored: true };
}
