// Why another bike cannot be added, what Pro brings, and how to get it.
import type { ReactElement, RefObject } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { BikeLimit } from "../billing.types";
import { PRO_SALES } from "../proSales";
import { ProBenefits } from "./ProBenefits";
import { ProPrimaryButton, ProQuietButton } from "./ProButtons";
import { ProStepFrame } from "./ProStepFrame";
import { ProStepHeading } from "./ProStepHeading";

const FREE_BIKE_LIMIT = 1;

interface OfferActionsProps {
  onHaveKey: () => void;
  onBuy: () => void;
}

interface OfferStepProps extends OfferActionsProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  limit: BikeLimit | undefined;
}

export function OfferStep({ headingRef, limit, onHaveKey, onBuy }: OfferStepProps): ReactElement {
  const { t } = useTranslation();
  const Actions = PRO_SALES ? SellingActions : KeyActions;

  return (
    <ProStepFrame actions={<Actions onHaveKey={onHaveKey} onBuy={onBuy} />}>
      <ProStepHeading headingRef={headingRef} title={t("billing.offerTitle")}>
        {t("billing.freeBikes", { count: limit?.bike_limit ?? FREE_BIKE_LIMIT })}
        {limit?.has_archived_bikes && ` ${t("billing.archivedCount")}`}
      </ProStepHeading>
      <ProBenefits mt={18} />
    </ProStepFrame>
  );
}

// Nothing can be bought yet, so a key is the one way.
function KeyActions({ onHaveKey }: OfferActionsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <ProPrimaryButton label={t("billing.haveKey")} onClick={onHaveKey} />
      <Text mt={16} ta="center" fz={13} lh={1.4} c="var(--color-muted)">
        {t("billing.paymentComing")}
      </Text>
    </>
  );
}

function SellingActions({ onHaveKey, onBuy }: OfferActionsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <Text visibleFrom="md" mb={12} fz={13} lh={1.4} c="var(--color-muted)">
        {t("billing.renewsMonthly")}
      </Text>
      <ProPrimaryButton label={t("billing.continueWithPro")} onClick={onBuy} />
      <ProQuietButton label={t("billing.haveKey")} onClick={onHaveKey} />
    </>
  );
}
