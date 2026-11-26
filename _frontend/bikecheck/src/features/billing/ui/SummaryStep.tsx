// What the rider agrees to before paying: the amount, the next payment and how it ends.
import type { ReactElement, RefObject } from "react";
import { Checkbox, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { nextPaymentDate } from "../proDates";
import { NEEDS_CONSENT, PRO_PLATFORM, PRO_PRICE } from "../proSales";
import type { ProPurchase } from "../useProPurchase";
import { ProBenefits } from "./ProBenefits";
import { ProPrimaryButton } from "./ProButtons";
import { ProOutcomeHeading } from "./ProOutcomeHeading";
import { ProRows } from "./ProRows";

const TEXTS = {
  web: { cancel: "billing.cancelWeb", pay: "billing.payWeb", note: "billing.payWebNote" },
  android: { cancel: "billing.cancelAndroid", pay: "billing.payAndroid", note: "billing.payAndroidNote" },
} as const;

interface SummaryStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  purchase: ProPurchase;
}

export function SummaryStep({ headingRef, purchase }: SummaryStepProps): ReactElement {
  const { t } = useTranslation();
  const texts = TEXTS[PRO_PLATFORM];

  return (
    <div className="pro-sheet__step pro-sheet__step--summary">
      <Stack gap={12}>
        <ProOutcomeHeading headingRef={headingRef} title={t("billing.summaryTitle")} amount={PRO_PRICE} />
        <ProBenefits />
        <ProRows
          rows={[
            { label: t("billing.rowNextPayment"), value: nextPaymentDate() },
            { label: t("billing.rowCancel"), value: t(texts.cancel) },
          ]}
        />
      </Stack>
      <Text fz={13} lh={1.5} c="text.7" style={{ textWrap: "pretty" }}>
        {t("billing.afterCancel")}
      </Text>
      {NEEDS_CONSENT && <Consent checked={purchase.consented} onChange={purchase.setConsented} />}
      <Stack gap={12}>
        <ProPrimaryButton label={t(texts.pay)} disabled={!purchase.canPay} onClick={() => void purchase.pay()} />
        <Text ta="center" fz={12} lh={1.4} c="var(--color-muted)" style={{ textWrap: "balance" }}>
          {t(texts.note)}
        </Text>
      </Stack>
    </div>
  );
}

interface ConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Consent({ checked, onChange }: ConsentProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Checkbox
      className="pro-consent"
      size="22px"
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      label={t("billing.consent")}
      styles={{
        // The label lies under the box too, so the whole tile ticks it.
        body: { position: "relative" },
        inner: { position: "absolute", top: 14, left: 14 },
        label: { padding: "14px 14px 14px 48px", fontSize: 13, lineHeight: 1.5, color: "var(--color-text-dim)" },
        input: checked ? {} : { backgroundColor: "var(--mantine-color-cards-6)", borderColor: "var(--color-border-solid)" },
      }}
    />
  );
}
