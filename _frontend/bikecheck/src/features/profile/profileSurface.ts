// The two surfaces somebody's garage page is drawn on.
import type { CSSProperties } from "react";

// docs/ui/card-surface.md: a panel, as the bike detail draws its cards - no hairline.
export const PANEL: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  boxShadow: "var(--elev-panel)",
  borderRadius: "1rem",
};

// A quiet button on the dark surface: Mantine's `default` variant paints white here, so it
// wears the field surface ConfirmModal's Cancel wears instead.
export const SECONDARY_BUTTON: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-7)",
  border: "1px solid var(--mantine-color-inputs-5)",
  color: "var(--mantine-color-text-6)",
};

// The same fallback the header avatar wears: initials on the card colour.
export const AVATAR_STYLE = {
  flexShrink: 0,
  "--avatar-bg": "var(--mantine-color-cards-5)",
  "--avatar-color": "var(--mantine-color-text-6)",
} as CSSProperties;

// A small mono label over a figure or beside a name - the profile's one caption style.
export const EYEBROW = {
  fz: 11,
  fw: 400,
  tt: "uppercase" as const,
  lts: "0.08em",
  c: "var(--color-text-dim)",
  className: "font-mono",
};
