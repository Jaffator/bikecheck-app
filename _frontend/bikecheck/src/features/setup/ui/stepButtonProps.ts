// The minus and plus that step a setting one notch at a time, shared by the gauges, the token
// column and the click rows so every stepper on the sheet is drawn the same way and the same
// size. Active: raised, visible border, bright glyph. Disabled: sunk, borderless, dim glyph.
import type { CSSProperties } from "react";
import type { ButtonProps } from "@mantine/core";

// Every stepper is this square, so a pair under a gauge, a pair under the token column and the
// pair beside a click count all read as the same control.
export const STEP_BUTTON_SIZE = 42;

// CSS vars instead of bg/bd/c props - inline styles would beat the disabled rule.
export const stepButtonStyle: CSSProperties = {
  flex: `0 0 ${STEP_BUTTON_SIZE}px`,
  width: STEP_BUTTON_SIZE,
  // A held press on a phone would otherwise select text or open the callout.
  touchAction: "manipulation",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  "--button-bg": "var(--mantine-color-cards-6)",
  "--button-bd": "1px solid var(--color-border-strong)",
  "--button-color": "var(--color-text-bright)",
  "--button-hover": "var(--mantine-color-cards-4)",
  "--button-hover-color": "var(--color-text-bright)",
  "--mantine-color-disabled": "var(--mantine-color-cards2-6)",
  "--mantine-color-disabled-color": "var(--mantine-color-cards-4)",
} as CSSProperties;

export const stepButtonProps: ButtonProps = {
  radius: "md",
  h: STEP_BUTTON_SIZE,
  px: 0,
  style: stepButtonStyle,
};
