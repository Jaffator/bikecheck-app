// The ride detail's action bar: every button one height, as the design's footer has it.
export const BAR_BUTTON_HEIGHT = 40;

// Delete and discard: red text without a frame, quiet at the drawer's end.
export const QUIET_RED_BUTTON = {
  variant: "subtle",
  color: "red.5",
  size: "sm",
  h: BAR_BUTTON_HEIGHT,
  // Mantine's left padding with a section: pulled back, the icon lines up with the content edge.
  style: { marginInlineStart: "calc(var(--button-padding-x) / -1.5)" },
} as const;
