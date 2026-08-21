// Shared by every field in the add-bike wizard so the steps look like one form.
export const inputStyles = {
  input: {
    borderRadius: "0.6rem",
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "1px solid var(--mantine-color-inputs-5)",
    height: "3rem",
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-cards-5)",
  } as React.CSSProperties,
};

// Extend input styles for autosizing textareas.
export const autosizeInputStyles = {
  input: {
    ...inputStyles.input,
    height: undefined,
    minHeight: "3rem",
    // Preserve vertical padding for autosizing textareas.
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
  } as React.CSSProperties,
};

// Use visible disabled states in the dark wizard theme.
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
      border: "1px solid var(--mantine-color-inputs-5)",
      color: "var(--mantine-color-text-6)",
    },
  },
};
