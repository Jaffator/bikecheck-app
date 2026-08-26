// The card surface a service row is drawn on — see docs/ui/card-surface.md. It lives on
// its own because two things wear it: a standalone service card, and the Month Group that
// holds the rows of one month in the full history.
export const SERVICE_CARD_SURFACE = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage:
    "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: "var(--mantine-radius-lg)",
  boxShadow:
    "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
} as const;
