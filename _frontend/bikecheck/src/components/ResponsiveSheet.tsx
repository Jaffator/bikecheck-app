// Every sheet in the app goes through here. Below the desktop breakpoint it is the bottom
// sheet docs/conventions/drawers.md describes; above it a panel or a modal (ADR 0036).
import { useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Drawer, Modal } from "@mantine/core";
import { SheetGrabber, SHEET_GRABBER_HEADER_PADDING } from "@/components/SheetGrabber";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { useIsDesktop } from "@/layout/breakpoints";

// One timing for every sheet; the direction is the edge it comes from.
const MOTION = { duration: 400, exitDuration: 400, timingFunction: "cubic-bezier(0.2, 0, 0, 1)" };

const OVERLAY = { backgroundOpacity: 0.7, blur: 4 };

const SURFACE: CSSProperties = { backgroundColor: "var(--mantine-color-cards-6)" };

// A bottom sheet's height is its own: a panel is as tall as the window, a modal as its content.
const UNSIZED: CSSProperties = { height: undefined, maxHeight: undefined, marginBottom: undefined };

type SheetStyles = Partial<Record<"content" | "header" | "body" | "title", CSSProperties>>;

interface ResponsiveSheetProps {
  opened: boolean;
  onClose: () => void;
  // A panel shows one item beside the list it came from; a modal asks for something and closes.
  desktop: "panel" | "modal";
  title?: ReactNode;
  // Mantine's own cross; a sheet drawing its own header turns it off.
  withCloseButton?: boolean;
  zIndex?: number;
  styles?: SheetStyles;
  onExited?: () => void;
  children: ReactNode;
}

export function ResponsiveSheet({
  opened,
  onClose,
  desktop,
  title,
  withCloseButton = true,
  zIndex,
  styles,
  onExited,
  children,
}: ResponsiveSheetProps): ReactElement {
  const isDesktop = useIsDesktop();
  const onTop = useOverlayBack(opened, onClose);
  const visible = useOpenedOnNextFrame(opened);
  const hasHeader = title !== undefined || withCloseButton;

  const shared = {
    opened: visible,
    onClose,
    title,
    withCloseButton,
    zIndex,
    // A sheet under a confirmation stays put when Esc dismisses the confirmation.
    closeOnEscape: onTop,
    onExitTransitionEnd: onExited,
  };

  if (!isDesktop) {
    return (
      <Drawer
        {...shared}
        position="bottom"
        radius="lg"
        transitionProps={{ ...MOTION, transition: "slide-up" }}
        overlayProps={OVERLAY}
        styles={{
          ...styles,
          // Mantine's header has nothing above it in the flow, so the grabber floats over its top edge.
          content: { ...SURFACE, ...(hasHeader ? { position: "relative" } : {}), ...styles?.content },
          header: { ...SURFACE, ...(hasHeader ? { paddingTop: SHEET_GRABBER_HEADER_PADDING } : {}), ...styles?.header },
        }}
      >
        <SheetGrabber onClose={onClose} floating={hasHeader} />
        {children}
      </Drawer>
    );
  }

  if (desktop === "panel") {
    return (
      <Drawer
        {...shared}
        position="right"
        radius={0}
        transitionProps={MOTION}
        // The list stays live beside it: another row swaps what the panel shows.
        withOverlay={false}
        lockScroll={false}
        trapFocus={false}
        styles={{
          ...styles,
          content: {
            ...SURFACE,
            ...styles?.content,
            ...UNSIZED,
            // The theme centres a bottom sheet in the column; a panel keeps to the window's edge.
            marginInline: 0,
            borderLeft: "1px solid var(--color-border-subtle)",
          },
          header: { ...SURFACE, ...styles?.header },
        }}
      >
        {children}
      </Drawer>
    );
  }

  // Mantine's own entrance, the one every other modal in the app makes.
  return (
    <Modal
      {...shared}
      centered
      radius="md"
      overlayProps={OVERLAY}
      styles={{
        ...styles,
        content: { ...SURFACE, ...styles?.content, ...UNSIZED },
        header: { ...SURFACE, ...styles?.header },
      }}
    >
      {children}
    </Modal>
  );
}

// Mantine skips the enter transition of a sheet that mounts already open, which a body
// remounted per opening always does - so the sheet opens on the frame after.
function useOpenedOnNextFrame(opened: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!opened || ready) return;
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [opened, ready]);

  return opened && ready;
}
