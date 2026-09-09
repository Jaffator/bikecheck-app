import { Prisma, type report_kind } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { decodeCursor, encodeCursor, type Cursor } from './cursor';
import { dateRange, isoDay } from './tool-dates';
import type { PageTool, ToolPage } from './tool-page';

// What a Share Link is doing. It takes both flags to tell the three apart, which is why the
// state is composed here rather than handed out as `is_public` and `revoked` (ADR 0011).
export type ReportState = 'unpublished' | 'published' | 'revoked';

// One Report the user has made. The public token and the frozen snapshot are not part of an
// answer, so they are never read: a share link the owner has not sent is not the chat's to give
// out. `bike_id` is informative only - a Report outlives the bike it was made for.
export interface ReportRow {
  report_id: number;
  kind: report_kind;
  bike_id: number;
  state: ReportState;
  // ISO day the Report was made.
  created_at: string;
  view_count: number;
  // ISO day, or null on a Report nobody has opened.
  last_viewed_at: string | null;
}

const listReportsInput = z.object({
  bike_id: z.number().int().optional().describe('Only reports made for this bike, from get_garage.'),
  from: z.string().optional().describe('Made on or after this ISO day, e.g. "2026-01-01".'),
  to: z.string().optional().describe('Made on or before this ISO day.'),
  cursor: z.string().optional().describe('next_cursor of the previous page. Omit for the first page.'),
});

export type ListReportsInput = z.infer<typeof listReportsInput>;

export type ReportsToolSet = {
  list_reports: PageTool<ListReportsInput, ReportRow>;
};

const LIST_REPORTS_DESCRIPTION =
  'The reports the user has exported, newest first: which document each one is - SERVICE for one ' +
  'occasion, PERIOD for a span of history, BIKECHECK for the bike itself - which bike it was made ' +
  'for, how often it has been opened, and what its link is doing: "unpublished" means made but ' +
  'never opened to anyone, "published" means the link is live, "revoked" means it is closed for ' +
  'good. The link itself is never returned and you cannot hand it out. A report outlives the bike ' +
  'it describes, so a bike_id that is in no bike of the garage is a bike the user has deleted.';

// One page of reports. A row is thin and an owner has few of them, so a page is a whole list
// many times over.
const PAGE_SIZE = 50;

// Newest report first, and the row id to break a tie - which is what keeps a page from skipping
// two reports exported in the same instant. `created_at` is never missing, so nulls never place.
const reportsOrder = [{ created_at: 'desc' }, { id: 'desc' }] satisfies Prisma.reportsOrderByWithRelationInput[];

// Everything a row is made of and nothing else. `public_token` and `snapshot` are not selected:
// what is not read cannot leak into an answer. `expires_at` is never written, so it says nothing.
const reportsSelect = {
  id: true,
  kind: true,
  bike_id: true,
  is_public: true,
  revoked: true,
  view_count: true,
  last_viewed_at: true,
  created_at: true,
} satisfies Prisma.reportsSelect;

type ReportRecord = Prisma.reportsGetPayload<{ select: typeof reportsSelect }>;

// The sharing axis of the catalogue: which documents the user has made and what their links are
// doing. Ownership is written here, and `userId` lives in the closure - it is in no schema, so
// there is nothing for the model to substitute.
export function reportsTools(prisma: PrismaService, userId: number): ReportsToolSet {
  return {
    list_reports: {
      description: LIST_REPORTS_DESCRIPTION,
      inputSchema: listReportsInput,
      execute: async (input: ListReportsInput): Promise<ToolPage<ReportRow>> => {
        const filter = reportsWhere(userId, input);
        const after = pageStart(decodeCursor(input.cursor));
        const where = after === undefined ? filter : { ...filter, AND: [after] };

        // One more row than a page, which is how the end of the list is recognised.
        const [found, total_count] = await Promise.all([
          prisma.reports.findMany({
            where,
            orderBy: reportsOrder,
            take: PAGE_SIZE + 1,
            select: reportsSelect,
          }),
          prisma.reports.count({ where: filter }),
        ]);

        const cut = found.length > PAGE_SIZE;
        const reports = cut ? found.slice(0, PAGE_SIZE) : found;
        const rows = reports.map(toReportRow);
        const last = reports.at(-1);

        if (!cut || last === undefined) return { rows, total_count };

        return { rows, total_count, truncated: true, next_cursor: encodeCursor(sortKeyOf(last), last.id) };
      },
    },
  };
}

// Ownership plus whatever the model asked to narrow by. `reports.user_id` carries the owner and
// the bike is not joined on purpose: `bike_id` is informative only, so a report of a bike its
// owner has deleted still reads (ADR 0011).
function reportsWhere(userId: number, input: ListReportsInput): Prisma.reportsWhereInput {
  const made = dateRange(input.from, input.to);

  return {
    user_id: userId,
    ...(input.bike_id === undefined ? {} : { bike_id: input.bike_id }),
    ...(made === undefined ? {} : { created_at: made }),
  };
}

// Where the next page carries on, for `created_at DESC, id DESC`.
function pageStart(cursor: Cursor | null): Prisma.reportsWhereInput | undefined {
  if (cursor === null) return undefined;

  const at = new Date(cursor.sortKey);
  if (Number.isNaN(at.getTime())) return undefined;

  return { OR: [{ created_at: { lt: at } }, { created_at: at, id: { lt: cursor.id } }] };
}

function sortKeyOf(report: ReportRecord): string {
  return report.created_at.toISOString();
}

function toReportRow(report: ReportRecord): ReportRow {
  return {
    report_id: report.id,
    kind: report.kind,
    bike_id: report.bike_id,
    state: stateOf(report),
    created_at: isoDay(report.created_at),
    view_count: report.view_count,
    last_viewed_at: isoDay(report.last_viewed_at),
  };
}

// Revoked first: a revoked link was published once, so the published flag stays set behind it.
function stateOf(report: ReportRecord): ReportState {
  if (report.revoked) return 'revoked';

  return report.is_public ? 'published' : 'unpublished';
}
