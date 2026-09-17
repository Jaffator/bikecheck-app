// Where the link ends (ADR 0031): the address is proven, and the only way on is the login
// form - the token proved an address, not a password, so nobody is signed in here. A link
// tapped twice lands here both times.
// The web login is not offered: the app is phone-only for now, so the way on is the app.
import type { ReactElement } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { Capacitor } from "@capacitor/core";
import { Trans, useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";
import { LOGIN_EMAIL_PARAM } from "@/features/login_page/Authentication";

// The custom scheme the native shell registers; opens the app's login with the address.
const APP_LOGIN_SCHEME = "bikecheck://login";

interface EmailVerifiedProps {
  email: string;
}

// A phone browser can hand off to the installed app; anywhere else the app is not there.
function canOpenApp(): boolean {
  return !Capacitor.isNativePlatform() && /Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function EmailVerified({ email }: EmailVerifiedProps): ReactElement {
  const { t } = useTranslation();
  const appLink = `${APP_LOGIN_SCHEME}?${LOGIN_EMAIL_PARAM}=${encodeURIComponent(email)}`;

  return (
    <Stack align="center" gap="md" ta="center">
      <MailCheck size={40} color="var(--mantine-color-text-8)" />
      <Text fw={600} size="lg" c="text.1">
        {t("auth.emailVerifiedTitle")}
      </Text>
      <Text size="sm" c="text.1">
        {/* Preserve a single translatable sentence with the address set apart. */}
        <Trans i18nKey="auth.emailVerifiedBody" values={{ email }} components={{ 1: <Text span fw={600} /> }} />
      </Text>

      {canOpenApp() && (
        <Button component="a" href={appLink} radius="lg" style={{ height: "3rem" }} fullWidth mt="sm">
          {t("auth.openInApp")}
        </Button>
      )}
    </Stack>
  );
}
