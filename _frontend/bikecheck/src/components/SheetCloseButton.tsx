// The ✕ of every bottom sheet, in the sheet's top-right corner whatever its heading does. The
// sheet must be positioned - see docs/conventions/drawers.md.
import type { CSSProperties, ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SHEET_GRABBER_Z_INDEX } from "@/components/SheetGrabber";

const CORNER: CSSProperties = {
  position: "absolute",
  top: "var(--sheet-close-inset)",
  right: "var(--sheet-close-inset)",
  // Over the grabber's strip, which would otherwise take the tap.
  zIndex: SHEET_GRABBER_Z_INDEX + 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--sheet-close-target)",
  height: "var(--sheet-close-target)",
};

interface SheetCloseButtonProps {
  onClose: () => void;
}

export function SheetCloseButton({ onClose }: SheetCloseButtonProps): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton aria-label={t("action.close")} onClick={onClose} style={CORNER}>
      <X size={16} strokeWidth={2} color="var(--mantine-color-text-6)" />
    </UnstyledButton>
  );
}
