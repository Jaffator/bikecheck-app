// One opening of the Pro sheet: the card on one side, the step it stands at on the other.
import type { FormEvent, ReactElement } from "react";
import { useBikeLimit } from "../billing.queries";
import { PRO_SALES } from "../proSales";
import { useProSheet } from "../useProSheet";
import { useStepFocus } from "../useStepFocus";
import { KeyDoneStep } from "./KeyDoneStep";
import { KeyField } from "./KeyField";
import { KeyStep } from "./KeyStep";
import { OfferStep } from "./OfferStep";
import { ProCard } from "./ProCard";
import { ProCardFoot } from "./ProCardFoot";
import { PurchaseSteps } from "./PurchaseSteps";
import "./proSheet.css";

interface ProSheetBodyProps {
  overWizard: boolean;
  // The software keyboard is up and leaves little room.
  isTyping: boolean;
  onGoOn: () => void;
  onClose: () => void;
}

export function ProSheetBody({ overWizard, isTyping, onGoOn, onClose }: ProSheetBodyProps): ReactElement {
  const { data: limit } = useBikeLimit();
  const pro = useProSheet();
  const { field, heading } = useStepFocus(pro.step, pro.showsBack);

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    pro.submit();
  }

  return (
    <form className={isTyping ? "pro-sheet pro-sheet--typing" : "pro-sheet"} onSubmit={onSubmit}>
      <div className="pro-sheet__stage">
        <ProCard
          step={pro.step}
          turned={pro.showsBack}
          foot={<ProCardFoot step={pro.step} activeSince={limit?.pro_since ?? pro.purchase.paidAt} />}
          back={
            <KeyField
              fieldRef={field}
              code={pro.code}
              onChange={pro.setCode}
              isChecking={pro.isChecking}
              failure={pro.failure}
            />
          }
        />
      </div>
      <div className="pro-sheet__side">
        {pro.step === "offer" && (
          <OfferStep headingRef={heading} limit={limit} onHaveKey={pro.showKey} onBuy={pro.purchase.showSummary} />
        )}
        {pro.showsBack && (
          <KeyStep headingRef={heading} isChecking={pro.isChecking} canSubmit={pro.canSubmit} onBack={pro.showOffer} />
        )}
        {pro.step === "keyDone" && <KeyDoneStep headingRef={heading} overWizard={overWizard} onGoOn={onGoOn} />}
        {PRO_SALES && (
          <PurchaseSteps
            headingRef={heading}
            step={pro.step}
            purchase={pro.purchase}
            onBack={pro.showOffer}
            onClose={onClose}
          />
        )}
      </div>
    </form>
  );
}
