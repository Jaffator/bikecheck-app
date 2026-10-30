// What the rows of a GroupedList share with the fields typed into them.
import type { CSSProperties } from "react";

// One tap target tall, whatever the row holds.
export const LIST_ROW_HEIGHT = 50;

// A field typed straight into a row: no box of its own, as tall as the row so the whole of it takes the tap.
export const listRowInputStyles = {
  root: { flex: 1, minWidth: 0 },
  input: {
    height: LIST_ROW_HEIGHT,
    minHeight: LIST_ROW_HEIGHT,
    padding: 0,
    textAlign: "right",
    fontSize: 14,
    color: "var(--mantine-color-text-6)",
    backgroundColor: "transparent",
    "--input-placeholder-color": "var(--mantine-color-text-8)",
  } as CSSProperties,
};
