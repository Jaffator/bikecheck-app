// Paid: what the rider has, the next payment and where the receipt is.
import type { ReactElement, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { nextPaymentDate } from "../proDates";
import { PRO_PRICE } from "../proSales";
import { ProPrimaryButton } from "./ProButtons";
import { ProOutcomeHeading } from "./ProOutcomeHeading";
import { ProRows } from "./ProRows";
import { ProStepFrame } from "./ProStepFrame";

interface PaidStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  paidAt: string;
  // The wizard is open underneath, so the way on is back to it.
  overWizard: boolean;
  onClose: () => void;
}

export function PaidStep({ headingRef, paidAt, overWizard, onClose }: PaidStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame
      // Closes only: a simulated payment gives no Pro, so the wizard would meet the limit again.
      actions={<ProPrimaryButton label={t(overWizard ? "billing.continue" : "billing.addBike")} onClick={onClose} />}
    >
      <ProOutcomeHeading headingRef={headingRef} title={t("billing.paidTitle")} outcome="done" amount={PRO_PRICE} />
      <ProRows
        rows={[
          { label: t("billing.rowBikes"), value: t("billing.rowBikesValue") },
          { label: t("billing.rowAi"), value: t("billing.rowAiValue") },
          { label: t("billing.rowNextPayment"), value: nextPaymentDate(paidAt) },
          { label: t("billing.rowReceipt"), value: t("billing.rowReceiptValue") },
        ]}
      />
    </ProStepFrame>
  );
}
