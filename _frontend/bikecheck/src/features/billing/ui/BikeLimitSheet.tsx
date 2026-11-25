// Why another bike cannot be added, and Pro. Mounted once for the whole app; every gate opens this one.
import { useEffect, type CSSProperties, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOpeningCount } from "@/hooks/useOpeningCount";
import { useIsDesktop } from "@/layout/breakpoints";
import { ADD_BIKE } from "@/layout/navItems";
import { useBikeLimitStore } from "@/store/store";
import { useAddBikeGate } from "../useAddBikeGate";
import { ProSheetBody } from "./ProSheetBody";

// Above the wizard's summary, which stays under it when the server refuses on save.
const SHEET_Z_INDEX = 400;

const MODAL_WIDTH = 940;

const SAFE_TOP = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))";

// The columns reach the modal's edges, so its ✕ lies over them.
const CLOSE_STRIP = 56;
const DESKTOP_STYLES: Record<"header" | "body", CSSProperties> = {
  header: { minHeight: CLOSE_STRIP, marginBottom: -CLOSE_STRIP, padding: "0 16px", backgroundColor: "transparent" },
  body: { padding: 0 },
};

export function BikeLimitSheet(): ReactElement {
  const { t } = useTranslation();
  const opened = useBikeLimitStore((state) => state.opened);
  const hide = useBikeLimitStore((state) => state.hide);
  const { pathname } = useLocation();
  const enterAddBike = useAddBikeGate();
  const isDesktop = useIsDesktop();
  const keyboardOffset = useKeyboardOffset();
  // Refused on save, the wizard is open underneath with everything entered.
  const overWizard = pathname === ADD_BIKE.path;
  // Mounted after whatever it opens over, so one Esc does not close the summary with it.
  const opening = useOpeningCount(opened);

  // Signing out unmounts it; the next rider must not meet it open.
  useEffect(() => hide, [hide]);

  function goOn(): void {
    // A second tap on the sheet sliding away.
    if (!useBikeLimitStore.getState().opened) return;
    hide();
    if (!overWizard) void enterAddBike();
  }

  return (
    <ResponsiveSheet
      key={opening}
      opened={opened}
      onClose={hide}
      desktop="modal"
      modalSize={MODAL_WIDTH}
      label={t("billing.proName")}
      zIndex={SHEET_Z_INDEX}
      styles={isDesktop ? DESKTOP_STYLES : phoneStyles(keyboardOffset)}
    >
      <ProSheetBody overWizard={overWizard} isTyping={keyboardOffset > 0} onGoOn={goOn} onClose={hide} />
    </ResponsiveSheet>
  );
}

// Rides above the software keyboard, which the webview does not resize for, in all the room that is left.
function phoneStyles(keyboardOffset: number): Record<"content", CSSProperties> {
  if (keyboardOffset === 0) return { content: { height: "auto", maxHeight: "88dvh" } };

  return {
    content: {
      height: "auto",
      marginBottom: keyboardOffset,
      maxHeight: `calc(100dvh - ${String(keyboardOffset)}px - ${SAFE_TOP})`,
    },
  };
}
