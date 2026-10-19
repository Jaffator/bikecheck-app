// The messages under the form and under the Google button, the same in both layouts.
import type { ReactElement, ReactNode } from "react";
import { Anchor, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CircleAlert } from "lucide-react";
import {
  googleErrorKey,
  isEmailNotVerified,
  isInvalidCredentials,
  loginErrorKey,
  registrationErrorKey,
  type AuthFormState,
} from "./useAuthForm";
import { ERROR_TEXT_COLOR } from "./authErrorStyles";

// Spans only: Mantine wraps a field's error in a <p>.
export function ErrorLine({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="flex items-start gap-2 text-left">
      <CircleAlert size={16} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

function ErrorText({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text fz={13} lh={1.4} c={ERROR_TEXT_COLOR}>
      <ErrorLine>{children}</ErrorLine>
    </Text>
  );
}

export function FormFeedback({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { login, resend, registration, cooldown, form } = auth;

  return (
    <>
      {login.isError && !isInvalidCredentials(login.error) && <ErrorText>{t(loginErrorKey(login.error))}</ErrorText>}
      {/* The way out of the 403: a fresh Verification Email, then a minute's rest. */}
      {login.isError &&
        isEmailNotVerified(login.error) &&
        (cooldown.secondsLeft > 0 ? (
          <Text size="sm" c="primary.6" fw={600}>
            {t("auth.resendSent", { seconds: cooldown.secondsLeft })}
          </Text>
        ) : (
          <Anchor
            component="button"
            type="button"
            c="primary.6"
            fw={600}
            size="sm"
            ta="left"
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
