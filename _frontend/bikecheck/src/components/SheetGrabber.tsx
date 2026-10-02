// The pill at the top of every bottom sheet: what says the sheet is a floating layer, and
// what hangs the drag that closes it on the sheet - see useSheetSwipe.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";

const PILL_HEIGHT = 4;

// What the sheet's first row starts below: the title's header, or the body when there is none.
export const SHEET_GRABBER_ROOM = `calc(var(--sheet-handle-top) + ${String(PILL_HEIGHT)}px + var(--sheet-handle-bottom))`;

// Over Mantine's sticky header, which stands at z-index 1000.
export const SHEET_GRABBER_Z_INDEX = 1001;

interface SheetGrabberProps {
  // Left out, the pill is drawn but the sheet cannot be dragged away.
  onClose?: () => void;
}

export function SheetGrabber({ onClose }: SheetGrabberProps): ReactElement {
  const attach = useSheetSwipe(onClose);

  return (
    <Box
      ref={attach}
      style={{
        // Laid over the positioned sheet's top edge on its surface, so a scrolled body passes under it.
        position: "absolute",
        top: 0,
        insetInline: 0,
        zIndex: SHEET_GRABBER_Z_INDEX,
        backgroundColor: "var(--mantine-color-cards-6)",
        paddingTop: "var(--sheet-handle-top)",
        paddingBottom: "var(--sheet-handle-bottom)",
        // The gesture is the sheet's, not the browser's.
        ...(onClose !== undefined ? { touchAction: "none", cursor: "grab" } : {}),
      }}
    >
      <Box mx="auto" w={36} h={PILL_HEIGHT} style={{ borderRadius: 9999, backgroundColor: "var(--color-border-subtle)" }} />
    </Box>
  );
}
