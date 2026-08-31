// The card surface a service row is drawn on — see docs/ui/card-surface.md. It lives on
// its own because two things wear it: a standalone service card, and the Month Group that
// holds the rows of one month in the full history.
export const SERVICE_CARD_SURFACE = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "1px solid var(--mantine-color-cards-6)",
  borderRadius: "var(--mantine-radius-lg)",
  boxShadow: "var(--elev-row)",
} as const;
