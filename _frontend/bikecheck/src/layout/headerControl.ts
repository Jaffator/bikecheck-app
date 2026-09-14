// Controls standing on a photo get their own shade; the page-wide scrim alone is not
// enough to read them against a bright image. Its own file, so AppLayout exports only
// a component and keeps Fast Refresh.
import type { CSSProperties } from "react";

export const TRANSPARENT_HEADER_CONTROL: CSSProperties = {
  background: "rgba(0, 0, 0, 0.45)",
  backdropFilter: "blur(8px)",
};
