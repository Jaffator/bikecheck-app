// The messages under the form and under the Google button, the same in both layouts.
import type { ReactElement, ReactNode } from "react";
import { Anchor, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { googleErrorKey, isEmailNotVerified, loginErrorKey, registrationErrorKey, type AuthFormState } from "./useAuthForm";

// Whatever red the screen set as --mantine-color-error, so messages match the field borders.
function ErrorText({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text size="sm" c="var(--mantine-color-error)" ta="center">
      {children}
    </Text>
  );
}

interface FormFeedbackProps {
  auth: AuthFormState;
  // The resend link and its countdown: dark on the phone's gradient, the accent on desktop.
  accent: string;
}

export function FormFeedback({ auth, accent }: FormFeedbackProps): ReactElement {
  const { t } = useTranslation();
  const { login, resend, registration, cooldown, form } = auth;

  return (
    <>
      {login.isError && <ErrorText>{t(loginErrorKey(login.error))}</ErrorText>}
      {/* The way out of the 403: a fresh Verification Email, then a minute's rest. */}
      {login.isError &&
        isEmailNotVerified(login.error) &&
        (cooldown.secondsLeft > 0 ? (
          <Text size="sm" c={accent} fw={600} ta="center">
            {t("auth.resendSent", { seconds: cooldown.secondsLeft })}
          </Text>
        ) : (
          <Anchor
            component="button"
            type="button"
            c={accent}
            fw={600}
            size="sm"
            ta="center"
            disabled={resend.isPending}
            onClick={auth.sendAgain}
          >
            {t("auth.resend")}
          </Anchor>
        ))}
      {resend.isError && <ErrorText>{t("auth.genericError")}</ErrorText>}
      {registration.isError && <ErrorText>{t(registrationErrorKey(registration.error))}</ErrorText>}
      {form.errors.terms && <ErrorText>{form.errors.terms}</ErrorText>}
    </>
  );
}

// A refused Google sign-in: the native answer, or the code the web callback came back with.
export function GoogleFeedback({ auth }: { auth: AuthFormState }): ReactElement | null {
  const { t } = useTranslation();
  const { googleToken, webGoogleError } = auth;

  if (googleToken.isError) {
    return <ErrorText>{t(googleErrorKey(googleToken.error))}</ErrorText>;
  }
  if (webGoogleError === null) return null;
  return <ErrorText>{t(webGoogleError)}</ErrorText>;
}
