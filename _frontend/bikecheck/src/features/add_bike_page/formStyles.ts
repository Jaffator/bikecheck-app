// What names a control, wherever it sits: Mantine draws it for a labelled input, and a
// plain Text draws it above a row of chips. Defined once so the two cannot drift - Mantine
// would otherwise size its own from --input-label-size, falling back to font-size-sm.
export const fieldLabel = {
  color: "var(--mantine-color-text-6)",
  fontSize: 14,
  // Input.css gives its own label font-weight: medium. Stated here so a Text above a row of
  // chips carries the same weight instead of falling back to the body's.
  fontWeight: 400,
  // The display face rather than the body one: a label names a control, it is not prose.
  // Taken from the variable so it follows whatever the theme calls its display font.
  fontFamily: "var(--font-sans)",
} as React.CSSProperties;

// Shared by every field in the add-bike wizard so the steps look like one form.
export const inputStyles = {
  label: fieldLabel,
  input: {
    borderRadius: "0.6rem",
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "1px solid var(--mantine-color-inputs-4)",
    height: "2.25rem",
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-text-8)",
  } as React.CSSProperties,
};

// Extend input styles for autosizing textareas.
export const autosizeInputStyles = {
  // Inherited rather than repeated, so the two cannot drift apart.
  label: fieldLabel,
  input: {
    ...inputStyles.input,
    height: "2.25rem",
    minHeight: "2.25rem",
    // Preserve vertical padding for autosizing textareas.
  } as React.CSSProperties,
};

// Use visible disabled states in the dark wizard theme.
export const disabledButtonStyles = {
  root: {
    "--mantine-color-disabled": "var(--mantine-color-cards-7)",
    "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
  } as React.CSSProperties,
};

interface ChipStyleOptions {
  // Whether a label too long for one line breaks onto the next. A chip naming a phrase
  // wants that; a chip in a row that scrolls sideways does not, because there is always
  // more width to move into. Defaults to wrapping.
  wrap?: boolean;
}

export function chipStyles(
  checked: boolean,
  { wrap = true }: ChipStyleOptions = {},
): {
  root: React.CSSProperties;
  label?: React.CSSProperties;
} {
  return {
    root: {
      "--chip-bg": "var(--mantine-color-primary-6)",
      "--chip-bd": "1px solid var(--mantine-color-primary-6)",
      "--mantine-color-disabled": "var(--mantine-color-cards-5)",
      "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
    } as React.CSSProperties,
    label: {
      // The same size as the heading above the chips, taken from it rather than repeated:
      // Chip.css would otherwise size the text from --chip-fz, which it derives from the
      // size prop, and the two would drift the moment one of them changed.
      fontSize: 14,
      // Chip.css pins a chip to one line: nowrap, a fixed height and a line-height sized to
      // that height. A tag name is a phrase, not a word, so a wrapping chip gives up all
      // three - it grows to its text and a row fits several instead of one. Padding
      // replaces the lost height either way, so both kinds of chip are the same height.
      whiteSpace: wrap ? "normal" : "nowrap",
      height: "auto",
      minHeight: "var(--chip-size)",
      lineHeight: 1.3,
      paddingTop: "0.4rem",
      paddingBottom: "0.4rem",
      paddingLeft: "0.8rem",
      paddingRight: "0.8rem",
      textAlign: "left",
      width: "auto",
      ...(checked
        ? {
            "--chip-color": "var(--mantine-color-primary-6)",
            backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 12%, transparent)",
            borderColor: "var(--mantine-color-primary-7)",
            color: "var(--mantine-color-primary-6)",
          }
        : {
            backgroundColor: "var(--mantine-color-cards-6)",
            borderColor: "var(--mantine-color-inputs-5)",
            color: "var(--mantine-color-text-7)",
          }),
    } as React.CSSProperties,
  };
}

// The dropdown renders in a portal, so it needs its own styles.
export const dropdownProps = {
  withinPortal: true,
  styles: {
    dropdown: {
      backgroundColor: "var(--mantine-color-background-8)",
      border: "1px solid var(--mantine-color-inputs-4)",
      color: "var(--mantine-color-text-6)",
    },
  },
};
