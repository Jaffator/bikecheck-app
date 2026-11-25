// The graphite card and its two sides. Only the side that is up can be reached.
import type { ReactElement, ReactNode } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface ProCardProps {
  turned: boolean;
  // What stands at the bottom of the front.
  foot: ReactNode;
  back: ReactNode;
}

export function ProCard({ turned, foot, back }: ProCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={turned ? "pro-card pro-card--turned" : "pro-card"}>
      <div className="pro-card__turn">
        <div className="pro-card__face pro-card__face--front" inert={turned}>
          <div className="pro-card__mark" aria-hidden />
          <Text className="pro-card__name" fz={16} lh="20px" fw={600}>
            {t("billing.proName")}
          </Text>
          <div className="pro-card__foot">{foot}</div>
        </div>
        <div className="pro-card__face pro-card__face--back" inert={!turned}>
          {back}
        </div>
      </div>
    </div>
  );
}
