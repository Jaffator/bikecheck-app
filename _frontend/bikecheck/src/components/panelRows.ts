// What every table row inside a Panel shares.
import type { KeyboardEvent } from "react";

export const PANEL_HAIRLINE = "1px solid var(--color-border-subtle)";
export const PANEL_ROW_PADDING = "10px 16px";

// Tap feedback on a card that is itself one button - docs/ui/card-surface.md.
export const PRESS_TRANSITION = "transform 0.12s ease";

// A row is a div so it can hold buttons; it answers Enter and Space only for itself.
export function onPanelRowKey(event: KeyboardEvent<HTMLDivElement>, open: () => void): void {
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  open();
}
