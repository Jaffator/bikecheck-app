import type { ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const BENEFITS = ["billing.benefitBikes", "billing.benefitAi"] as const;

// What Pro brings.
export function ProBenefits({ mt }: { mt?: number }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack component="ul" gap={10} mt={mt} mb={0} p={0} style={{ listStyle: "none" }}>
      {BENEFITS.map((benefit) => (
        <Group key={benefit} component="li" gap={12} wrap="nowrap">
          <Check size={20} strokeWidth={2} color="var(--mantine-color-primary-6)" aria-hidden style={{ flexShrink: 0 }} />
          <Text fz={16} lh="24px" c="text.6">
            {t(benefit)}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
