// The graphite card and its two sides. Only the side that is up can be reached.
import type { ReactElement, ReactNode } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { ProStep } from "../useProSheet";

interface ProCardProps {
  // The card dresses for some of them.
  step: ProStep;
  turned: boolean;
  // What stands at the bottom of the front.
  foot: ReactNode;
  back: ReactNode;
}

export function ProCard({ step, turned, foot, back }: ProCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={turned ? "pro-card pro-card--turned" : "pro-card"} data-step={step}>
      <div className="pro-card__turn">
        <div className="pro-card__face pro-card__face--front" inert={turned}>
          <div className="pro-card__mark" aria-hidden />
          <Text className="pro-card__name" fz={16} lh="20px" fw={600}>
            {t("billing.proName")}
          </Text>
          <div className="pro-card__foot">{foot}</div>
          {step === "confirming" && <div className="pro-card__run" aria-hidden />}
        </div>
        <div className="pro-card__face pro-card__face--back" inert={!turned}>
          {back}
        </div>
      </div>
    </div>
  );
}
