// The page the link in a Verification Email opens on the web (ADR 0031): outside the
// authenticated shell, no session fetch, no nav, so a device that has never seen BikeCheck
// can open it. The verifying happens on a tap, never on load - a mail scanner following
// the link must verify nothing.
import type { ReactElement, ReactNode } from "react";
import { Button, Paper, Stack, Text } from "@mantine/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MailOpen } from "lucide-react";
import logoName from "@/assets/logo_name.svg";
import { useVerifyEmail } from "@/features/users/users.queries";
import { EmailVerified } from "./EmailVerified";
import { LinkInvalid } from "./LinkInvalid";

// What the link carries; the backend reads everything else from its signed payload.
const TOKEN_PARAM = "token";
// The one answer the backend gives a link that is expired, forged or stale.
const TOKEN_INVALID_STATUS = 400;

export function VerifyEmail(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get(TOKEN_PARAM);
  const verify = useVerifyEmail();

  // The link's page is replaced in history: there is nothing to come back to.
  function backToLogin(): void {
    navigate("/", { replace: true });
  }

  if (verify.isSuccess) {
    return (
      <Shell>
        <EmailVerified email={verify.data.email} />
      </Shell>
    );
  }

  // No token, or one the backend refused: the link verifies nothing, whatever the reason.
  if (token === null || (verify.isError && verify.error.status === TOKEN_INVALID_STATUS)) {
    return (
      <Shell>
        <LinkInvalid onBackToLogin={backToLogin} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Stack align="center" gap="md" ta="center">
        <MailOpen size={40} color="var(--mantine-color-text-8)" />
        <Text fw={600} size="lg" c="text.1">
          {t("auth.verifyEmailTitle")}
        </Text>
        <Text size="sm" c="text.1">
          {t("auth.verifyEmailBody")}
        </Text>
        {/* Anything but a refused link - the network, a busy server - is worth another tap. */}
        {verify.isError && (
          <Text size="sm" c="red.6">
            {t("auth.genericError")}
          </Text>
        )}
        <Button
          radius="lg"
          style={{ height: "3rem" }}
          fullWidth
          mt="sm"
          loading={verify.isPending}
          onClick={() => verify.mutate({ token })}
        >
          {t("auth.verifyEmailButton")}
        </Button>
      </Stack>
    </Shell>
  );
}

// The login screen's frame, minus its gradient: a plain background.9 backdrop.
function Shell({ children }: { children: ReactNode }): ReactElement {
  return (
    <Stack
      className="bg-background-900 auth-enter relative isolate"
      align="center"
      gap="md"
      py="xl"
      style={{ minHeight: "100dvh" }}
    >
      <img
        src={logoName}
        alt="BikeCheck Logo"
        style={{ width: "100%", maxWidth: "200px", position: "absolute", top: "10rem", left: 0, right: 0, margin: "0 auto" }}
      />
      <Paper w="90%" radius="md" p="lg" mt="180" bg="transparent">
        {children}
      </Paper>
    </Stack>
  );
}
