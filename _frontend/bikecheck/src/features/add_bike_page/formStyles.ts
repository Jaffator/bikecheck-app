// Shared by every field in the add-bike wizard so the steps look like one form.
export const inputStyles = {
  input: {
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "none",
    height: "3rem",
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-text-9)",
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
