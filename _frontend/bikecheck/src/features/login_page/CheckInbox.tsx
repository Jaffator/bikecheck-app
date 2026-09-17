// Where registration ends (ADR 0031): the Verification Email is on its way, and the app
// says to which address, so a typo is obvious before the rider goes looking for a mail
// that will never come. A lost email is a tap away - "Send it again" - and the way on is
// back to sign in.
import type { ReactElement } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { useResendVerification } from "@/features/users/users.queries";
import { useResendCooldown } from "@/features/users/useResendCooldown";

interface CheckInboxProps {
  email: string;
  onBackToLogin: () => void;
}

export function CheckInbox({ email, onBackToLogin }: CheckInboxProps): ReactElement {
  const { t } = useTranslation();
  const resend = useResendVerification();
  const cooldown = useResendCooldown();

  // The rest starts once the request landed; a failed one stays a tap away.
  function sendAgain(): void {
    resend.mutate({ email }, { onSuccess: cooldown.start });
  }

  return (
    <Stack align="center" gap="md" ta="center">
      <Mail size={40} color="var(--mantine-color-text-8)" />
      <Text fw={600} size="lg" c="text.1">
        {t("auth.checkInboxTitle")}
      </Text>
      <Text size="sm" c="text.1">
        {/* Preserve a single translatable sentence with the address set apart. */}
        <Trans i18nKey="auth.checkInboxBody" values={{ email }} components={{ 1: <Text span fw={600} /> }} />
      </Text>
      {resend.isError && (
        <Text size="sm" c="red.8">
          {t("auth.genericError")}
        </Text>
      )}
      <Button radius="lg" style={{ height: "3rem" }} fullWidth mt="sm" onClick={onBackToLogin}>
        {t("auth.backToLogin")}
      </Button>
      {/* While resting, the confirmation and the countdown stand where the button was. */}
      {cooldown.secondsLeft > 0 ? (
        <Text size="sm" c="text.1" fw={600} mt="md">
          {t("auth.resendSent", { seconds: cooldown.secondsLeft })}
        </Text>
      ) : (
        <Button
          variant="outline"
          fullWidth
          color="primary.6"
          radius="lg"
          style={{ height: "3rem" }}
          loading={resend.isPending}
          onClick={sendAgain}
        >
          {t("auth.resend")}
        </Button>
      )}
    </Stack>
  );
}
