import type { ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function WelcomeSkipButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <UnstyledButton mih={44} fz={14} fw={500} c="var(--color-muted)" onClick={onClick}>
      {t("onboarding.welcome.skip")}
    </UnstyledButton>
  );
}
