// What the key on the back of the card does, and the button that sends it.
import type { ReactElement, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { PRO_PRICE, PRO_SALES } from "../proSales";
import { ProPrimaryButton, ProQuietButton } from "./ProButtons";
import { ProStepFrame } from "./ProStepFrame";
import { ProStepHeading } from "./ProStepHeading";

interface KeyStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  isChecking: boolean;
  canSubmit: boolean;
  onBack: () => void;
}

export function KeyStep({ headingRef, isChecking, canSubmit, onBack }: KeyStepProps): ReactElement {
  const { t } = useTranslation();
  const backLabel = PRO_SALES ? t("billing.noKeyBuy", { price: PRO_PRICE }) : t("billing.keyBack");

  return (
    <ProStepFrame
      actions={
        <>
          <ProPrimaryButton label={t(isChecking ? "billing.keyChecking" : "billing.keyUnlock")} disabled={!canSubmit} />
          <ProQuietButton label={backLabel} disabled={isChecking} onClick={onBack} />
        </>
      }
    >
      <ProStepHeading headingRef={headingRef} title={t("billing.keyTitle")}>
        {t("billing.keyBody")}
      </ProStepHeading>
    </ProStepFrame>
  );
}
