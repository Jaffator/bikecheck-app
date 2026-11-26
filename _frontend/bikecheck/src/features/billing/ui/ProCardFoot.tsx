// What the front of the card says at its bottom: what Pro costs or that it is coming, or how it stands.
import type { ReactElement } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { proDate } from "../proDates";
import { PRO_PRICE, PRO_SALES } from "../proSales";
import type { ProStep } from "../useProSheet";

interface ProCardFootProps {
  step: ProStep;
  // Null without Pro.
  activeSince: string | null;
}

export function ProCardFoot({ step, activeSince }: ProCardFootProps): ReactElement {
  const { t } = useTranslation();

  if (activeSince !== null) {
    return <FootFact label={t("billing.activeSince")} labelColor="var(--color-text-dim)" value={proDate(activeSince)} />;
  }
  if (PRO_SALES) {
    return step === "paymentFailed" ? <FootFact label={PRO_PRICE} value={t("billing.unpaid")} /> : <Price />;
  }

  return (
    <Text fz={{ base: 28, md: 32 }} lh={1.1} fw={700} lts="var(--tracking-display)">
      {t("billing.comingSoon")}
    </Text>
  );
}

interface FootFactProps {
  label: string;
  // Left out, the card's own colour.
  labelColor?: string;
  value: string;
}

function FootFact({ label, labelColor, value }: FootFactProps): ReactElement {
  return (
    <>
      <Text className="tabular-nums" fz={12} lh="16px" c={labelColor}>
        {label}
      </Text>
      <Text className="tabular-nums" mt={2} fz={18} lh="24px" fw={600}>
        {value}
      </Text>
    </>
  );
}

function Price(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="pro-price tabular-nums">
      <span className="pro-price__amount">{PRO_PRICE}</span>
      <span className="pro-price__period">{t("billing.perMonth")}</span>
    </div>
  );
}
