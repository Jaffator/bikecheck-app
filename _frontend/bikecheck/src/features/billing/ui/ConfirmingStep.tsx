import type { ReactElement, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ProStepFrame } from "./ProStepFrame";
import { ProStepHeading } from "./ProStepHeading";

// The rider is back from paying and the payment is not known yet.
export function ConfirmingStep({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame actions={null}>
      <div role="status">
        <ProStepHeading headingRef={headingRef} title={t("billing.confirmingTitle")}>
          {t("billing.confirmingBody")}
        </ProStepHeading>
      </div>
    </ProStepFrame>
  );
}
