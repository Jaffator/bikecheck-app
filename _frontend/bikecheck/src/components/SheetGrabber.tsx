// The pill at the top of every bottom sheet: what says the sheet is a floating layer, and
// what hangs the drag that closes it on the sheet - see useSheetSwipe.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";

// Mantine's own header has to make room for a strip laid over its top edge.
export const SHEET_GRABBER_HEADER_PADDING = 28;

interface SheetGrabberProps {
  onClose: () => void;
  // A sheet that keeps Mantine's header has nothing to sit above in the flow, so the strip
  // is laid over the header's top edge instead of taking a row of its own.
  floating?: boolean;
}

export function SheetGrabber({ onClose, floating = false }: SheetGrabberProps): ReactElement {
  const attach = useSheetSwipe(onClose);

  return (
    <Box
      ref={attach}
      style={{
        // Room either side of the pill, handed straight back to the layout below, so no
        // sheet shifts by adopting one.
        paddingTop: 8,
        paddingBottom: 8,
        ...(floating ? { position: "absolute", top: 0, insetInline: 0, zIndex: 1 } : { marginBottom: -8 }),
        flexShrink: 0,
        // The gesture is the sheet's, not the browser's.
        touchAction: "none",
        cursor: "grab",
      }}
    >
      <Box mx="auto" w={36} h={4} style={{ borderRadius: 9999, backgroundColor: "var(--color-border-subtle)" }} />
    </Box>
  );
}
