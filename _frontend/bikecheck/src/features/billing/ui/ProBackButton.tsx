// Back to the offer: in the sheet's corner opposite the ✕, on desktop at the top of the step.
import type { ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SHEET_GRABBER_Z_INDEX } from "@/components/SheetGrabber";

export function ProBackButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    // Over the grabber's strip and the modal's header, which would otherwise take the tap.
    <div className="pro-back" style={{ zIndex: SHEET_GRABBER_Z_INDEX + 1 }}>
      <UnstyledButton className="pro-back__button" aria-label={t("billing.keyBack")} onClick={onClick}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden />
      </UnstyledButton>
      <span className="pro-back__name" aria-hidden>
        {t("billing.proName")}
      </span>
    </div>
  );
}
