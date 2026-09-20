// What the list panels on /follows share: the page padding, the eyebrow's count, the empty line.
import type { TFunction } from "i18next";

// Each tab body brings its own bottom padding, so the swipe track can lay them side by side.
export const PAGE_BOTTOM = "calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// "Sleduješ · n" once the list is in; the eyebrow alone while it loads.
export function countedTitle(label: string, rows: readonly unknown[] | undefined): string {
  return rows === undefined ? label : `${label} · ${String(rows.length)}`;
}

// Nothing while the list loads, the fault when it failed, else what the panel says when empty.
export function emptyText(t: TFunction, rows: readonly unknown[] | undefined, failed: boolean, empty: string): string {
  if (failed) return t("follow.listFailed");
  if (rows === undefined) return "";
  return empty;
}
