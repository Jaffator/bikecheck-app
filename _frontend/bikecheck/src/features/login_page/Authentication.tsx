import { useState, type CSSProperties, type ReactElement } from "react";
import { Anchor, Box, Button, Checkbox, Divider, Group, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import type { PaperProps } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useToggle } from "@mantine/hooks";
import { Trans, useTranslation } from "react-i18next";
import { detectLanguage } from "@/i18n";
import { GoogleButton } from "./GoogleButton";
import { CheckInbox } from "./CheckInbox";
import { Mail, Lock, User } from "lucide-react";
import logoName from "../../assets/logo_name.svg";
import { useLogin, useRegistration, useGoogleNative, useResendVerification } from "@/features/users/users.queries";
import { useResendCooldown } from "@/features/users/useResendCooldown";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { Link, useSearchParams } from "react-router-dom";
import type { ApiError } from "@/api/client";

// The backend's error code for the right password on an account whose address is not yet
// verified (ADR 0031); it arrives in the response message.
const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
// 409 on registration with this in the details: the name, not the address, is taken.
const NAME_TAKEN = "NAME_TAKEN";

// The address another screen hands the login form, so the rider only types the password -
// the verified page sends it here.
export const LOGIN_EMAIL_PARAM = "email";

// How the web Google callback refuses (ADR 0031): the browser is mid-redirect, so the
// refusal comes back here as a query flag. An Unverified Account arrives as its address, for
// the inbox state; a Verified Email met by an address Google does not vouch for arrives as
// the backend's error code. The same names the backend's auth controller sets.
const EMAIL_NOT_VERIFIED_PARAM = "emailNotVerified";
const GOOGLE_ERROR_PARAM = "googleError";
const GOOGLE_EMAIL_UNVERIFIED = "GOOGLE_EMAIL_UNVERIFIED";

// The native app sits under a status bar the web page does not, so the block starts lower.
const NATIVE_SHIFT_PX = Capacitor.isNativePlatform() ? 50 : 0;
const LOGO_TOP = `calc(10rem + ${String(NATIVE_SHIFT_PX)}px)`;
const FORM_TOP = `calc(180px + ${String(NATIVE_SHIFT_PX)}px)`;
// A phone pins the logo and the switch link to the screen so the form stays put under the
// keyboard; from sm up the three flow as one block, centred by the auto margins.
const PINNED = { base: "absolute", sm: "static" } as const;
// The form's width on a wide screen: a single column of inputs, not the whole page.
const FORM_MAX_WIDTH = "26rem";

// Every error on the login screen - field messages, input borders - in the darker red.
const ERROR_COLOR_STYLE = { "--mantine-color-error": "var(--mantine-color-red-8)" } as CSSProperties;

function Logo(): ReactElement {
  return (
    <Box
      component="img"
      src={logoName}
      alt="BikeCheck Logo"
      w="100%"
      maw={200}
      mx="auto"
      pos={PINNED}
      top={LOGO_TOP}
      left={0}
      right={0}
      mt={{ base: 0, sm: "auto" }}
    />
  );
}

// The right password on an Unverified Account: the one refusal "Send it again" can fix.
function isEmailNotVerified(error: ApiError): boolean {
  return error.status === 403 && error.details.includes(EMAIL_NOT_VERIFIED);
}

// What to tell the rider under the form when login fails.
function loginErrorKey(error: ApiError): string {
  if (error.status === 401) return "auth.invalidCredentials";
  if (isEmailNotVerified(error)) return "auth.emailNotVerified";
  return "auth.genericError";
}

// A 409 is one of two things taken: the name, or the address.
function registrationErrorKey(error: ApiError): string {
  if (error.status !== 409) return "auth.genericError";
  return error.details.includes(NAME_TAKEN) ? "auth.nameTaken" : "auth.emailTaken";
}

// What to tell the rider under the Google button when the native sign-in was refused.
function googleErrorKey(error: ApiError): string {
  if (error.status === 409) return "auth.googleEmailUnverified";
  if (isEmailNotVerified(error)) return "auth.emailNotVerified";
  return "auth.genericError";
}

export function AuthenticationForm(props: PaperProps) {
  const { t } = useTranslation();
  const login = useLogin();
  const registration = useRegistration();
  const googleToken = useGoogleNative();
  const resend = useResendVerification();
  const cooldown = useResendCooldown();
  const [type, toggle] = useToggle(["login", "register"]);
  const [searchParams, setSearchParams] = useSearchParams();
  // The address the inbox state shows, or null while the form is up. Set by a registration,
  // a refused native Google sign-in, or the web callback's flag.
  const [inboxEmail, setInboxEmail] = useState<string | null>(() => searchParams.get(EMAIL_NOT_VERIFIED_PARAM));
  // The code the web callback came back with; the native answer lives on the mutation.
  const webGoogleError = searchParams.get(GOOGLE_ERROR_PARAM);
  // Keep focused fields above the keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>();
  const form = useForm({
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

  // The web callback's flags are read once; leaving the form must not carry them along.
  function clearGoogleFlags(): void {
    if (!searchParams.has(EMAIL_NOT_VERIFIED_PARAM) && !searchParams.has(GOOGLE_ERROR_PARAM)) return;
    setSearchParams({}, { replace: true });
  }

  // Clear state from the previous form mode.
  function switchType(): void {
    toggle();
    form.clearErrors();
    login.reset();
    registration.reset();
    googleToken.reset();
    resend.reset();
    clearGoogleFlags();
  }

  // From the inbox state back to the login form, the address still filled in.
  function backToLogin(): void {
    setInboxEmail(null);
    toggle("login");
    form.clearErrors();
    login.reset();
    registration.reset();
    googleToken.reset();
    resend.reset();
    clearGoogleFlags();
  }

  // "Send it again" under a refused login goes to the address just typed. The rest starts
  // once the request landed; a failed one stays a tap away.
  function sendAgain(): void {
    resend.mutate({ email: form.values.email }, { onSuccess: cooldown.start });
  }

  // The web flow leaves the app and comes back through the callback, with cookies or a
  // query flag. The native app posts the token and gets a session or a refusal; a 403 is an
  // Unverified Account, and the address the sign-in carried goes to the inbox state.
  async function handleGoogleSignIn(): Promise<void> {
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

  // Registration and a refused Google sign-in end here, not in the app: the account cannot
  // sign in until the link in the Verification Email is used (ADR 0031).
  if (inboxEmail !== null) {
    return (
      <>
        <Logo />
        <Paper w="90%" maw={FORM_MAX_WIDTH} radius="md" p="lg" mt={{ base: FORM_TOP, sm: 0 }} mb={{ base: 0, sm: "auto" }} {...props} bg="transparent">
          <CheckInbox email={inboxEmail} onBackToLogin={backToLogin} />
        </Paper>
        {/* Covers the login gradient: this screen sits on plain background.9. */}
        <div className="w-full h-full absolute top-0 left-0 bg-background-900" style={{ zIndex: -5 }} />
      </>
    );
  }

  return (
    <>
      <Logo />
      <Paper
        w="90%"
        maw={FORM_MAX_WIDTH}
        radius="md"
        p="lg"
        mt={{ base: FORM_TOP, sm: 0 }}
        {...props}
        bg="transparent"
        ref={formRef}
        style={ERROR_COLOR_STYLE}
      >
        <form
          // Submit the active form.
          onSubmit={form.onSubmit((values) => {
            if (type === "login") {
              login.mutate({ email: values.email, password: values.password });
            } else {
              // No sign-in afterwards: the form ends on the inbox state.
              registration.mutate(
                {
                  name: values.name,
                  email: values.email,
                  password: values.password,
                  language: detectLanguage(),
                },
                { onSuccess: (data) => setInboxEmail(data.email) },
              );
            }
          })}
        >
          <Stack gap="sm">
            {type === "register" && (
              <TextInput
                placeholder={t("auth.namePlaceholder")}
                leftSection={<User size={18} />}
                value={form.values.name}
                onChange={(event) => form.setFieldValue("name", event.currentTarget.value)}
                error={form.errors.name}
                radius="lg"
                styles={{
                  input: {
                    backgroundColor: "color-mix(in srgb, var(--mantine-color-inputs-8) 60%, transparent)",
                    border: "none",
                    height: "2.5rem",
                    color: "var(--mantine-color-text-6)",
                  },
                }}
              />
            )}

            <TextInput
              placeholder={t("auth.emailPlaceholder")}
              leftSection={<Mail size={18} />}
              value={form.values.email}
              onChange={(event) => form.setFieldValue("email", event.currentTarget.value)}
              error={form.errors.email}
              radius="lg"
              styles={{
                input: {
                  backgroundColor: "color-mix(in srgb, var(--mantine-color-inputs-8) 60%, transparent)",
                  border: "none",
                  height: "2.5rem",
                  color: "var(--mantine-color-text-6)",
                },
              }}
            />

            <PasswordInput
              placeholder={t("auth.passwordPlaceholder")}
              leftSection={<Lock size={18} />}
              value={form.values.password}
              onChange={(event) => form.setFieldValue("password", event.currentTarget.value)}
              error={form.errors.password}
              radius="lg"
              styles={{
                input: {
                  backgroundColor: "color-mix(in srgb, var(--mantine-color-inputs-8) 60%, transparent)",
                  border: "none",
                  height: "2.5rem",
                  color: "var(--mantine-color-text-6)",
                },
                visibilityToggle: { color: "var(--mantine-color-text-8)" },
              }}
            />

            {type === "register" && (
              <PasswordInput
                placeholder={t("auth.confirmPasswordPlaceholder")}
                leftSection={<Lock size={18} />}
                value={form.values.confirmPassword}
                onChange={(event) => form.setFieldValue("confirmPassword", event.currentTarget.value)}
                error={form.errors.confirmPassword}
                radius="lg"
                styles={{
                  input: {
                    backgroundColor: "color-mix(in srgb, var(--mantine-color-inputs-8) 60%, transparent)",
                    border: "none",
                    height: "2.5rem",
                    color: "var(--mantine-color-text-6)",
                  },
                  visibilityToggle: { color: "var(--mantine-color-text-8)" },
                }}
              />
            )}

            {type === "register" && (
              <Checkbox
                ml="2px"
                c="background.9"
                styles={{ body: { alignItems: "center" }, labelWrapper: { paddingInlineStart: 0 } }}
                // The document the box is agreeing to, one tap away and open to a visitor
                // with no account yet.
                label={
                  <Trans
                    i18nKey="auth.acceptTerms"
                    components={{
                      1: <Anchor component={Link} to="/legal/terms" c="background.9" fw={600} td="underline" />,
                    }}
                  />
                }
                checked={form.values.terms}
                onChange={(event) => form.setFieldValue("terms", event.currentTarget.checked)}
              />
            )}
          </Stack>

          <Stack justify="space-between" mt="lg">
            {login.isError && (
              <Text size="sm" c="red.8" ta="center">
                {t(loginErrorKey(login.error))}
              </Text>
            )}
            {/* The way out of the 403: a fresh Verification Email, then a minute's rest. */}
            {login.isError &&
              isEmailNotVerified(login.error) &&
              (cooldown.secondsLeft > 0 ? (
                <Text size="sm" c="background.9" fw={600} ta="center">
                  {t("auth.resendSent", { seconds: cooldown.secondsLeft })}
                </Text>
              ) : (
                <Anchor
                  component="button"
                  type="button"
                  c="background.9"
                  fw={600}
                  size="sm"
                  ta="center"
                  disabled={resend.isPending}
                  onClick={sendAgain}
                >
                  {t("auth.resend")}
                </Anchor>
              ))}
            {resend.isError && (
              <Text size="sm" c="red.8" ta="center">
                {t("auth.genericError")}
              </Text>
            )}
            {registration.isError && (
              <Text size="sm" c="red.8" ta="center">
                {t(registrationErrorKey(registration.error))}
              </Text>
            )}
            {form.errors.terms && (
              <Text size="sm" c="red.8" ta="center">
                {form.errors.terms}
              </Text>
            )}

            <Button
              type="submit"
              radius="lg"
              size="md"
              fz="sm"
              // style={{ height: "2.5rem" }}
              loading={login.isPending || registration.isPending}
            >
              {type === "login" ? t("auth.login") : t("auth.register")}
            </Button>
          </Stack>
        </form>
        <Divider
          label={t("auth.or")}
          labelPosition="center"
          my="sm"
          w="100%"
          mx="auto"
          color="background.9"
          styles={{ label: { color: "var(--mantine-color-background-9)" } }}
        />

        <Stack mb="md">
          <GoogleButton
            onClick={() => handleGoogleSignIn()}
            variant="filled"
            bg="background.9"
            c="text.6"
            fz="sm"
            radius="lg"
            size="md"
          >
            {t("auth.continueWithGoogle")}
          </GoogleButton>
          {/* A refused Google sign-in: the native answer, or the code the web callback came back with. */}
          {googleToken.isError && (
            <Text size="sm" c="red.8" ta="center">
              {t(googleErrorKey(googleToken.error))}
            </Text>
          )}
          {!googleToken.isError && webGoogleError === GOOGLE_EMAIL_UNVERIFIED && (
            <Text size="sm" c="red.8" ta="center">
              {t("auth.googleEmailUnverified")}
            </Text>
          )}
        </Stack>
      </Paper>
      <Group
        align="center"
        justify="center"
        gap={4}
        pos={PINNED}
        bottom="1.5rem"
        left={0}
        right={0}
        mb={{ base: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))", sm: "auto" }}
      >
        <Text size="sm" lh={1} c="background.9">
          {type === "register" ? t("auth.haveAccount") : t("auth.noAccount")}
        </Text>
        <Anchor component="button" type="button" lh={1} c="background.9" fw={600} size="md" onClick={switchType}>
          {type === "register" ? t("auth.login") : t("auth.register")}
        </Anchor>
      </Group>
    </>
  );
}
