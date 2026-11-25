// Why another bike cannot be added, what Pro brings and that it cannot be bought yet.
import type { ReactElement, RefObject } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BikeLimit } from "../billing.types";
import { ProPrimaryButton } from "./ProButtons";
import { ProStepFrame } from "./ProStepFrame";
import { ProStepHeading } from "./ProStepHeading";

const FREE_BIKE_LIMIT = 1;
const BENEFITS = ["billing.benefitBikes", "billing.benefitAi"] as const;

interface OfferStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  limit: BikeLimit | undefined;
  onHaveKey: () => void;
}

export function OfferStep({ headingRef, limit, onHaveKey }: OfferStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame
      actions={
        <>
          <ProPrimaryButton label={t("billing.haveKey")} onClick={onHaveKey} />
          <Text mt={16} ta="center" fz={13} lh={1.4} c="var(--color-muted)">
            {t("billing.paymentComing")}
          </Text>
        </>
      }
    >
      <ProStepHeading headingRef={headingRef} title={t("billing.offerTitle")}>
        {t("billing.freeBikes", { count: limit?.bike_limit ?? FREE_BIKE_LIMIT })}
        {limit?.has_archived_bikes && ` ${t("billing.archivedCount")}`}
      </ProStepHeading>
      <Stack component="ul" gap={10} mt={18} mb={0} p={0} style={{ listStyle: "none" }}>
        {BENEFITS.map((benefit) => (
          <Group key={benefit} component="li" gap={12} wrap="nowrap">
            <Check size={20} strokeWidth={2} color="var(--mantine-color-primary-6)" aria-hidden style={{ flexShrink: 0 }} />
            <Text fz={16} lh="24px" c="text.6">
              {t(benefit)}
            </Text>
          </Group>
        ))}
      </Stack>
    </ProStepFrame>
  );
}
