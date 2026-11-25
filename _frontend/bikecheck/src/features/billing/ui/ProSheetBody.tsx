// One opening of the Pro sheet: the card on one side, the step it stands at on the other.
import type { FormEvent, ReactElement } from "react";
import { useBikeLimit } from "../billing.queries";
import { useProSheet } from "../useProSheet";
import { useStepFocus } from "../useStepFocus";
import { KeyDoneStep } from "./KeyDoneStep";
import { KeyField } from "./KeyField";
import { KeyStep } from "./KeyStep";
import { OfferStep } from "./OfferStep";
import { ProCard } from "./ProCard";
import { ProCardFoot } from "./ProCardFoot";
import "./proSheet.css";

interface ProSheetBodyProps {
  overWizard: boolean;
  // The software keyboard is up and leaves little room.
  isTyping: boolean;
  onGoOn: () => void;
}

export function ProSheetBody({ overWizard, isTyping, onGoOn }: ProSheetBodyProps): ReactElement {
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
          turned={pro.showsBack}
          foot={<ProCardFoot activeSince={limit?.pro_since ?? null} />}
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
        {pro.step === "offer" && <OfferStep headingRef={heading} limit={limit} onHaveKey={pro.showKey} />}
        {pro.showsBack && (
          <KeyStep headingRef={heading} isChecking={pro.isChecking} canSubmit={pro.canSubmit} onBack={pro.showOffer} />
        )}
        {pro.step === "keyDone" && <KeyDoneStep headingRef={heading} overWizard={overWizard} onGoOn={onGoOn} />}
      </div>
    </form>
  );
}
