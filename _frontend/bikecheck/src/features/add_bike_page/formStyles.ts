// Shared by every field in the add-bike wizard so the steps look like one form.
export const inputStyles = {
  input: {
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "none",
    height: "3rem",
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-cards-5)",
  } as React.CSSProperties,
};

// Same look as inputStyles, but for a field that grows with its content: the
// fixed height would cap an autosize textarea at one line and hide the rest.
export const autosizeInputStyles = {
  input: {
    ...inputStyles.input,
    height: undefined,
    minHeight: "3rem",
    // The textarea keeps Mantine's own vertical padding, which the fixed-height
    // input did not need.
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
  } as React.CSSProperties,
};

// Mantine's default disabled button reads as missing rather than blocked on the
// dark theme, so every gated action in the wizard dims to the card colour.
export const disabledButtonStyles = {
  root: {
    "--mantine-color-disabled": "var(--mantine-color-cards-5)",
    "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
  } as React.CSSProperties,
};

// The dropdown renders in a portal, so it needs its own styles.
export const dropdownProps = {
  withinPortal: true,
  styles: {
    dropdown: {
      backgroundColor: "var(--mantine-color-cards-6)",
      border: "1px solid var(--mantine-color-cards-5)",
      color: "var(--mantine-color-text-6)",
    },
  },
};
