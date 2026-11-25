// The steps of buying Pro. Drawn with sales on only.
import type { ReactElement, RefObject } from "react";
import type { ProPurchase } from "../useProPurchase";
import type { ProStep } from "../useProSheet";
import { ConfirmingStep } from "./ConfirmingStep";
import { PaidStep } from "./PaidStep";
import { PaymentFailedStep } from "./PaymentFailedStep";
import { ProBackButton } from "./ProBackButton";
import { SummaryStep } from "./SummaryStep";

interface PurchaseStepsProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  step: ProStep;
  purchase: ProPurchase;
  overWizard: boolean;
  onBack: () => void;
  onClose: () => void;
}

export function PurchaseSteps({
  headingRef,
  step,
  purchase,
  overWizard,
  onBack,
  onClose,
}: PurchaseStepsProps): ReactElement {
  return (
    <>
      {step === "summary" && (
        <>
          <ProBackButton onClick={onBack} />
          <SummaryStep headingRef={headingRef} onPay={() => void purchase.pay()} />
        </>
      )}
      {step === "confirming" && <ConfirmingStep headingRef={headingRef} />}
      {step === "paymentFailed" && (
        <PaymentFailedStep headingRef={headingRef} onTryAgain={purchase.showSummary} onClose={onClose} />
      )}
      {step === "paid" && purchase.paidAt !== null && (
        <PaidStep headingRef={headingRef} paidAt={purchase.paidAt} overWizard={overWizard} onClose={onClose} />
      )}
    </>
  );
}
