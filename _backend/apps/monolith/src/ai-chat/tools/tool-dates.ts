// The days the tools share: how a date leaves a row, and how a from/to pair the model sent
// becomes one filter. Nothing here throws - a date it cannot read is no date at all, on the
// rule the cursor already follows.

// A date as the model reads it: the ISO day, never a timestamp. A column that is never null
// answers a string, so a row carrying one does not have to pretend the day might be missing.
export function isoDay(date: Date): string;
export function isoDay(date: Date | null): string | null;
export function isoDay(date: Date | null): string | null {
  return date === null ? null : date.toISOString().slice(0, 10);
}

// The two ends of a span, as Prisma reads them on a date column - nullable or NOT NULL alike.
export interface DayRange {
  gte?: Date;
  lte?: Date;
}

// A from/to pair as one filter, or nothing when neither end is a date. Unparseable text is no
// filter rather than a failure.
export function dateRange(from: string | undefined, to: string | undefined): DayRange | undefined {
  const gte = dayStart(from);
  const lte = dayEnd(to);
  if (gte === undefined && lte === undefined) return undefined;

  return { ...(gte === undefined ? {} : { gte }), ...(lte === undefined ? {} : { lte }) };
}

function dayStart(text: string | undefined): Date | undefined {
  return atTime(text, 'T00:00:00.000Z');
}

function dayEnd(text: string | undefined): Date | undefined {
  return atTime(text, 'T23:59:59.999Z');
}

// An ISO day from the model, read at one end of that day. A full timestamp is trimmed to its
// day, and anything else reads as no date at all.
function atTime(text: string | undefined, time: string): Date | undefined {
  if (text === undefined || !/^\d{4}-\d{2}-\d{2}/.test(text)) return undefined;

  const date = new Date(`${text.slice(0, 10)}${time}`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
