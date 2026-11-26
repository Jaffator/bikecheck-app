// Pro from a key: what the rider has, that it is free, and the way on to the bike.
import type { ReactElement, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ProPrimaryButton } from "./ProButtons";
import { ProOutcomeHeading } from "./ProOutcomeHeading";
import { ProRows } from "./ProRows";
import { ProStepFrame } from "./ProStepFrame";

interface KeyDoneStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  // The wizard is open underneath, so the way on is back to it.
  overWizard: boolean;
  onGoOn: () => void;
}

export function KeyDoneStep({ headingRef, overWizard, onGoOn }: KeyDoneStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame
      actions={<ProPrimaryButton label={t(overWizard ? "billing.continue" : "billing.addBike")} onClick={onGoOn} />}
    >
      <ProOutcomeHeading headingRef={headingRef} title={t("billing.unlockedTitle")} outcome="done" />
      <ProRows
        rows={[
          { label: t("billing.rowBikes"), value: t("billing.rowBikesValue") },
          { label: t("billing.rowAi"), value: t("billing.rowAiValue") },
          { label: t("billing.rowPrice"), value: t("billing.rowPriceValue") },
        ]}
      />
    </ProStepFrame>
  );
}
