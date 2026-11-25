import type { ReactElement, RefObject } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ProPrimaryButton, ProQuietButton } from "./ProButtons";
import { ProOutcomeHeading } from "./ProOutcomeHeading";
import { ProStepFrame } from "./ProStepFrame";

interface PaymentFailedStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onTryAgain: () => void;
  onClose: () => void;
}

export function PaymentFailedStep({ headingRef, onTryAgain, onClose }: PaymentFailedStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame
      actions={
        <>
          <ProPrimaryButton label={t("billing.tryAgain")} onClick={onTryAgain} />
          <ProQuietButton label={t("billing.notNow")} onClick={onClose} />
        </>
      }
    >
      <div role="alert">
        <ProOutcomeHeading headingRef={headingRef} title={t("billing.paymentFailedTitle")} outcome="failed" />
        <Text mt={12} fz={15} lh={1.45} c="var(--color-text-dim)" style={{ textWrap: "pretty" }}>
          {t("billing.paymentFailedBody")}
        </Text>
      </div>
    </ProStepFrame>
  );
}
