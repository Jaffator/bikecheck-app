// The one thing the tools share. A cursor carries the sort key and the identity of the last
// row read, so a page never skips a row that shares its sort key with the next one. It is
// opaque to the model, which is exactly why it can come back as nonsense.

const SEPARATOR = '|';

// The place a page carries on from: the sort key as text, and the row that held it.
export interface Cursor {
  sortKey: string;
  id: number;
}

export function encodeCursor(sortKey: string | number, id: number): string {
  return Buffer.from(`${String(sortKey)}${SEPARATOR}${String(id)}`, 'utf8').toString('base64url');
}

// Nonsense from the model is not an error: the tool reads it as no cursor and starts from the
// beginning, which is a first page instead of a failed answer.
export function decodeCursor(cursor: string | null | undefined): Cursor | null {
  if (!cursor) return null;

  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const separator = decoded.lastIndexOf(SEPARATOR);
  if (separator <= 0) return null;

  const sortKey = decoded.slice(0, separator);
  const id = Number(decoded.slice(separator + 1));
  if (!Number.isInteger(id)) return null;

  return { sortKey, id };
}
