// The login screen's reds, shared by both layouts.
import type { CSSProperties } from "react";

// Field borders take the darker red through Mantine's error colour; words take the lighter one that reads on black.
export const AUTH_ERROR_STYLE = { "--mantine-color-error": "var(--mantine-color-red-8)" } as CSSProperties;
export const ERROR_TEXT_COLOR = "var(--mantine-color-red-4)";
// Mantine's own message under a field, matched to the ones above the button.
export const FIELD_ERROR_STYLE: CSSProperties = { color: ERROR_TEXT_COLOR, fontSize: 13, lineHeight: 1.4, marginTop: 8 };
