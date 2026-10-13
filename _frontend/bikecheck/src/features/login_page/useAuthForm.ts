// What the login screen does, whichever layout draws it: the form, its requests and the
// inbox state they can end in.
import { useEffect, useState, type FormEvent } from "react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useToggle } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";
import { visitorLanguage } from "@/i18n";
import { useLogin, useRegistration, useGoogleNative, useResendVerification } from "@/features/users/users.queries";
import { useResendCooldown } from "@/features/users/useResendCooldown";
import type { ApiError } from "@/api/client";
import { trackEvent } from "@/utils/analytics";

// The backend's error code for the right password on an account whose address is not yet
// verified (ADR 0031); it arrives in the response message.
const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
// 409 on registration with this in the details: the name, not the address, is taken.
const NAME_TAKEN = "NAME_TAKEN";

// The address another screen hands the login form, so the rider only types the password -
// the verified page sends it here.
export const LOGIN_EMAIL_PARAM = "email";

// The Marketing Website's "Create account" opens the register form (ADR 0041).
const MODE_PARAM = "mode";

// How the web Google callback refuses (ADR 0031): the browser is mid-redirect, so the
// refusal comes back here as a query flag. An Unverified Account arrives as its address, for
// the inbox state; a Verified Email met by an address Google does not vouch for arrives as
// the backend's error code. The same names the backend's auth controller sets.
const EMAIL_NOT_VERIFIED_PARAM = "emailNotVerified";
const GOOGLE_ERROR_PARAM = "googleError";
const GOOGLE_EMAIL_UNVERIFIED = "GOOGLE_EMAIL_UNVERIFIED";
// The round trip itself failed (Google error, token exchange); a cancel comes back with no flag.
const GOOGLE_SIGN_IN_FAILED = "GOOGLE_SIGN_IN_FAILED";

// What to tell the rider for the web callback's code, or null for none worth showing.
function webGoogleErrorKey(code: string | null): string | null {
  if (code === GOOGLE_EMAIL_UNVERIFIED) return "auth.googleEmailUnverified";
  if (code === GOOGLE_SIGN_IN_FAILED) return "auth.genericError";
  return null;
}

// The right password on an Unverified Account: the one refusal "Send it again" can fix.
export function isEmailNotVerified(error: ApiError): boolean {
  return error.status === 403 && error.details.includes(EMAIL_NOT_VERIFIED);
}

// What to tell the rider under the form when login fails.
export function loginErrorKey(error: ApiError): string {
  if (error.status === 401) return "auth.invalidCredentials";
  if (isEmailNotVerified(error)) return "auth.emailNotVerified";
  return "auth.genericError";
}

// A 409 is one of two things taken: the name, or the address.
export function registrationErrorKey(error: ApiError): string {
  if (error.status !== 409) return "auth.genericError";
  return error.details.includes(NAME_TAKEN) ? "auth.nameTaken" : "auth.emailTaken";
}

// What to tell the rider under the Google button when the native sign-in was refused.
export function googleErrorKey(error: ApiError): string {
  if (error.status === 409) return "auth.googleEmailUnverified";
  if (isEmailNotVerified(error)) return "auth.emailNotVerified";
  return "auth.genericError";
}

export type AuthMode = "login" | "register";

// useToggle starts on the first option.
function authModes(params: URLSearchParams): AuthMode[] {
  return params.get(MODE_PARAM) === "register" ? ["register", "login"] : ["login", "register"];
}

export interface AuthFormValues {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

export interface AuthFormState {
  type: AuthMode;
  form: UseFormReturnType<AuthFormValues>;
  login: ReturnType<typeof useLogin>;
  registration: ReturnType<typeof useRegistration>;
  googleToken: ReturnType<typeof useGoogleNative>;
  resend: ReturnType<typeof useResendVerification>;
  cooldown: ReturnType<typeof useResendCooldown>;
  // The address the inbox state shows, or null while the form is up.
  inboxEmail: string | null;
  // The message for the web callback's code; the native answer lives on the mutation.
  webGoogleError: string | null;
  submit: (event?: FormEvent<HTMLFormElement>) => void;
  switchType: () => void;
  backToLogin: () => void;
  sendAgain: () => void;
  signInWithGoogle: () => Promise<void>;
}

export function useAuthForm(): AuthFormState {
  const { t } = useTranslation();
  const login = useLogin();
  const registration = useRegistration();
  const googleToken = useGoogleNative();
  const resend = useResendVerification();
  const cooldown = useResendCooldown();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, toggle] = useToggle<AuthMode>(authModes(searchParams));
  // Set by a registration, a refused native Google sign-in, or the web callback's flag.
  const [inboxEmail, setInboxEmail] = useState<string | null>(() => searchParams.get(EMAIL_NOT_VERIFIED_PARAM));
  const webGoogleError = webGoogleErrorKey(searchParams.get(GOOGLE_ERROR_PARAM));
  const form = useForm<AuthFormValues>({
    initialValues: {
      email: searchParams.get(LOGIN_EMAIL_PARAM) ?? "",
      name: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },

    validate: {
      name: (val) => (type === "register" && val.trim().length === 0 ? t("auth.nameRequired") : null),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : t("auth.invalidEmail")),
      password: (val) => (val.length < 8 ? t("auth.passwordTooShort") : null),
      // A typo guard, so it lives on the client alone.
      confirmPassword: (val, values) => (type === "register" && val !== values.password ? t("auth.passwordMismatch") : null),
      terms: (val) => (type === "register" && !val ? t("auth.termsRequired") : null),
    },
  });

  // Counts the form shown: on open and on every switch between login and register.
  useEffect(() => {
    trackEvent("auth-open", { mode: type });
  }, [type]);

  // The web callback's flags are read once; leaving the form must not carry them along.
  function clearGoogleFlags(): void {
    if (!searchParams.has(EMAIL_NOT_VERIFIED_PARAM) && !searchParams.has(GOOGLE_ERROR_PARAM)) return;
    setSearchParams({}, { replace: true });
  }

  // Clear the requests and flags a previous form mode left behind.
  function resetRequests(): void {
    form.clearErrors();
    login.reset();
    registration.reset();
    googleToken.reset();
    resend.reset();
    clearGoogleFlags();
  }

  function switchType(): void {
    toggle();
    resetRequests();
  }

  // From the inbox state back to the login form, the address still filled in.
  function backToLogin(): void {
    setInboxEmail(null);
    toggle("login");
    resetRequests();
  }

  // "Send it again" under a refused login goes to the address just typed. The rest starts
  // once the request landed; a failed one stays a tap away.
  function sendAgain(): void {
    resend.mutate({ email: form.values.email }, { onSuccess: cooldown.start });
  }

  const submit = form.onSubmit((values) => {
    if (type === "login") {
      login.mutate({ email: values.email, password: values.password });
      return;
    }
    // No sign-in afterwards: the form ends on the inbox state.
    registration.mutate(
      { name: values.name, email: values.email, password: values.password, language: visitorLanguage() },
      { onSuccess: (data) => setInboxEmail(data.email) },
    );
  });

  // The web flow leaves the app and comes back through the callback, with cookies or a
  // query flag. The native app posts the token and gets a session or a refusal; a 403 is an
  // Unverified Account, and the address the sign-in carried goes to the inbox state.
  async function signInWithGoogle(): Promise<void> {
    // A keepalive request, so the web redirect below does not cancel it.
    trackEvent("auth-google");
    if (Capacitor.getPlatform() === "web") {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
    } else if (Capacitor.getPlatform() === "android") {
      const result = await GoogleSignIn.signIn();
      console.log("Google sign-in result:", result);
      googleToken.mutate(
        { idToken: result.idToken },
        {
          onError: (error) => {
            if (isEmailNotVerified(error) && result.email !== null) setInboxEmail(result.email);
          },
        },
      );
    }
  }

  return {
    type,
    form,
    login,
    registration,
    googleToken,
    resend,
    cooldown,
    inboxEmail,
    webGoogleError,
    submit,
    switchType,
    backToLogin,
    sendAgain,
    signInWithGoogle,
  };
}
