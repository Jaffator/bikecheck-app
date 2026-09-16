// Where the link ends (ADR 0031): the address is proven, and the only way on is the login
// form - the token proved an address, not a password, so nobody is signed in here. A link
// tapped twice lands here both times.
import type { ReactElement } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";

interface EmailVerifiedProps {
  email: string;
  onSignIn: () => void;
}

export function EmailVerified({ email, onSignIn }: EmailVerifiedProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack align="center" gap="md" ta="center">
      <MailCheck size={40} color="var(--mantine-color-background-9)" />
      <Text fw={600} size="lg" c="background.9">
        {t("auth.emailVerifiedTitle")}
      </Text>
      <Text size="sm" c="background.9">
        {/* Preserve a single translatable sentence with the address set apart. */}
        <Trans i18nKey="auth.emailVerifiedBody" values={{ email }} components={{ 1: <Text span fw={600} /> }} />
      </Text>
      <Button radius="lg" style={{ height: "3rem" }} fullWidth mt="sm" onClick={onSignIn}>
        {t("auth.signIn")}
      </Button>
    </Stack>
  );
}
