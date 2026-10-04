// Every sheet in the app goes through here. Below the desktop breakpoint it is the bottom
// sheet docs/conventions/drawers.md describes; above it a panel or a modal (ADR 0036).
import { useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Drawer, Modal, type ModalProps } from "@mantine/core";
import { SheetCloseButton } from "@/components/SheetCloseButton";
import { SheetGrabber, SHEET_GRABBER_ROOM } from "@/components/SheetGrabber";
import { SHEET_TRANSITION } from "@/components/sheetMotion";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { useIsDesktop } from "@/layout/breakpoints";

// The desktop panel's timing; a bottom sheet takes SHEET_TRANSITION.
const PANEL_MOTION = { duration: 400, exitDuration: 400, timingFunction: "cubic-bezier(0.2, 0, 0, 1)" };

const OVERLAY = { backgroundOpacity: 0.7, blur: 4 };

const SURFACE: CSSProperties = { backgroundColor: "var(--mantine-color-cards-6)" };

// A bottom sheet's height is its own: a panel is as tall as the window, a modal as its content.
const UNSIZED: CSSProperties = { height: undefined, maxHeight: undefined, marginBottom: undefined };

// Keeps a bottom sheet's last element clear of Android's gesture bar.
export const SHEET_PAD_BOTTOM =
  "calc(var(--sheet-pad-bottom) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// Only the body scrolls, so the grabber, a title and the ✕ stay where they are.
const SHEET_CONTENT: CSSProperties = { position: "relative", display: "flex", flexDirection: "column" };
const SHEET_BODY_SCROLL: CSSProperties = { flex: "1 1 auto", minHeight: 0, overflowY: "auto" };

// Spread after a sheet's own styles: on a phone the spacing is the wrapper's alone.
const SHEET_HEADER: CSSProperties = {
  // Mantine's min-height would let a scrolling body squeeze the heading.
  flexShrink: 0,
  paddingTop: SHEET_GRABBER_ROOM,
  paddingInline: "var(--sheet-pad-x)",
};
const SHEET_TITLE: CSSProperties = { paddingRight: "var(--sheet-title-pad-right)" };
const SHEET_BODY_PADDING: CSSProperties = {
  paddingInline: "var(--sheet-pad-x)",
  paddingBottom: SHEET_PAD_BOTTOM,
};

// Back still lands on a sheet that cannot be dismissed, so the page under it stays put.
const IGNORE_BACK = (): void => {};

type SheetStyles = Partial<Record<"content" | "header" | "body" | "title", CSSProperties>>;

interface ResponsiveSheetProps {
  opened: boolean;
  onClose: () => void;
  // A panel shows one item beside the list it came from; a modal asks for something and closes.
  desktop: "panel" | "modal";
  // Width of the desktop modal; left out, Mantine's default.
  modalSize?: ModalProps["size"];
  title?: ReactNode;
  // Mantine's own cross on desktop; a sheet drawing its own header turns it off. A bottom
  // sheet wears the wrapper's ✕ instead.
  withCloseButton?: boolean;
  // False for a sheet that must be answered: no outside click, Esc, swipe or back button.
  dismissible?: boolean;
  zIndex?: number;
  styles?: SheetStyles;
  onExited?: () => void;
  children: ReactNode;
}

export function ResponsiveSheet({
  opened,
  onClose,
  desktop,
  modalSize,
  title,
  withCloseButton = true,
  dismissible = true,
  zIndex,
  styles,
  onExited,
  children,
}: ResponsiveSheetProps): ReactElement {
  const isDesktop = useIsDesktop();
  const onTop = useOverlayBack(opened, dismissible ? onClose : IGNORE_BACK);
  const visible = useOpenedOnNextFrame(opened);
  const shownTitle = useShownWhileOpen(opened, title);
  const shownChildren = useShownWhileOpen(opened, children);

  const shared = {
    opened: visible,
    onClose,
    title: shownTitle,
    withCloseButton,
    zIndex,
    // A sheet under a confirmation stays put when Esc dismisses the confirmation.
    closeOnEscape: dismissible && onTop,
    closeOnClickOutside: dismissible,
    onExitTransitionEnd: onExited,
  };

  if (!isDesktop) {
    const titled = Boolean(shownTitle);

    return (
      <Drawer
        {...shared}
        // The ✕ is the wrapper's own, so only a title makes Mantine's header.
        withCloseButton={false}
        position="bottom"
        radius="lg"
        transitionProps={SHEET_TRANSITION}
        overlayProps={OVERLAY}
        styles={{
          ...styles,
          content: { ...SURFACE, ...SHEET_CONTENT, ...styles?.content },
          header: { ...SURFACE, ...styles?.header, ...SHEET_HEADER },
          title: { ...styles?.title, ...SHEET_TITLE },
          body: {
            ...SHEET_BODY_SCROLL,
            ...styles?.body,
            ...SHEET_BODY_PADDING,
            paddingTop: titled ? 0 : SHEET_GRABBER_ROOM,
          },
        }}
      >
        <SheetGrabber onClose={dismissible ? onClose : undefined} />
        {dismissible && <SheetCloseButton onClose={onClose} />}
        {shownChildren}
      </Drawer>
    );
  }

  if (desktop === "panel") {
    return (
      <Drawer
        {...shared}
        position="right"
        radius={0}
        transitionProps={PANEL_MOTION}
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
        {shownChildren}
      </Drawer>
    );
  }

  // Mantine's own entrance, the one every other modal in the app makes.
  return (
    <Modal
      {...shared}
      centered
      size={modalSize}
      radius="md"
      overlayProps={OVERLAY}
      styles={{
        ...styles,
        content: { ...SURFACE, ...styles?.content, ...UNSIZED },
        header: { ...SURFACE, ...styles?.header },
      }}
    >
      {shownChildren}
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

// What an open sheet last showed, so a closing one slides out full instead of emptied.
function useShownWhileOpen<T>(opened: boolean, value: T): T {
  const [kept, setKept] = useState(value);
  if (opened && kept !== value) setKept(value);
  return opened ? value : kept;
}
