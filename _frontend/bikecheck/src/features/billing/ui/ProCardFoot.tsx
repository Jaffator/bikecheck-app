// What the front of the card says at its bottom: that Pro is coming, or since when it runs.
import type { ReactElement } from "react";
import { Text } from "@mantine/core";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

interface ProCardFootProps {
  // Null without Pro.
  activeSince: string | null;
}

export function ProCardFoot({ activeSince }: ProCardFootProps): ReactElement {
  const { t } = useTranslation();

  if (activeSince === null) {
    return (
      <Text fz={{ base: 28, md: 32 }} lh={1.1} fw={700} lts="var(--tracking-display)">
        {t("billing.comingSoon")}
      </Text>
    );
  }

  return (
    <>
      <Text fz={12} lh="16px" c="var(--color-text-dim)">
        {t("billing.activeSince")}
      </Text>
      <Text className="tabular-nums" mt={2} fz={18} lh="24px" fw={600}>
        {dayjs(activeSince).format("D. M. YYYY")}
      </Text>
    </>
  );
}
