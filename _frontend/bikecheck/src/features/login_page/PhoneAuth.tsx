// The login screen below the desktop width: the form over the gradient, pinned against the keyboard.
import type { CSSProperties, ReactElement } from "react";
import { Anchor, Box, Button, Checkbox, Divider, Group, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Mail, Lock, User } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import logoName from "../../assets/logo_name.svg";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { GoogleButton } from "./GoogleButton";
import { CheckInbox } from "./CheckInbox";
import { FormFeedback, GoogleFeedback } from "./AuthFeedback";
import type { AuthFormState } from "./useAuthForm";

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

const FIELD_STYLES = {
  input: {
    backgroundColor: "color-mix(in srgb, var(--mantine-color-inputs-8) 60%, transparent)",
    border: "none",
    height: "2.5rem",
    color: "var(--mantine-color-text-6)",
  },
};

const PASSWORD_STYLES = {
  ...FIELD_STYLES,
  visibilityToggle: { color: "var(--mantine-color-text-8)" },
};

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

export function PhoneAuth({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { type, form, login, registration } = auth;
  // Keep focused fields above the keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>();

  // Registration and a refused Google sign-in end here, not in the app: the account cannot
  // sign in until the link in the Verification Email is used (ADR 0031).
  if (auth.inboxEmail !== null) {
    return (
      <>
        <Logo />
        <Paper w="90%" maw={FORM_MAX_WIDTH} radius="md" p="lg" mt={{ base: FORM_TOP, sm: 0 }} mb={{ base: 0, sm: "auto" }} bg="transparent">
          <CheckInbox email={auth.inboxEmail} onBackToLogin={auth.backToLogin} />
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
        bg="transparent"
        ref={formRef}
        style={ERROR_COLOR_STYLE}
      >
        <form onSubmit={auth.submit}>
          <Stack gap="sm">
            {type === "register" && (
              <TextInput
                placeholder={t("auth.namePlaceholder")}
                leftSection={<User size={18} />}
                value={form.values.name}
                onChange={(event) => form.setFieldValue("name", event.currentTarget.value)}
                error={form.errors.name}
                radius="lg"
                styles={FIELD_STYLES}
              />
            )}

            <TextInput
              placeholder={t("auth.emailPlaceholder")}
              leftSection={<Mail size={18} />}
              value={form.values.email}
              onChange={(event) => form.setFieldValue("email", event.currentTarget.value)}
              error={form.errors.email}
              radius="lg"
              styles={FIELD_STYLES}
            />

            <PasswordInput
              placeholder={t("auth.passwordPlaceholder")}
              leftSection={<Lock size={18} />}
              value={form.values.password}
              onChange={(event) => form.setFieldValue("password", event.currentTarget.value)}
              error={form.errors.password}
              radius="lg"
              styles={PASSWORD_STYLES}
            />

            {type === "register" && (
              <PasswordInput
                placeholder={t("auth.confirmPasswordPlaceholder")}
                leftSection={<Lock size={18} />}
                value={form.values.confirmPassword}
                onChange={(event) => form.setFieldValue("confirmPassword", event.currentTarget.value)}
                error={form.errors.confirmPassword}
                radius="lg"
                styles={PASSWORD_STYLES}
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
            <FormFeedback auth={auth} accent="background.9" />
            <Button type="submit" radius="lg" size="md" fz="sm" loading={login.isPending || registration.isPending}>
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
            onClick={() => auth.signInWithGoogle()}
            variant="filled"
            bg="background.9"
            c="text.6"
            fz="sm"
            radius="lg"
            size="md"
          >
            {t("auth.continueWithGoogle")}
          </GoogleButton>
          <GoogleFeedback auth={auth} />
        </Stack>
      </Paper>
      <Stack
        align="center"
        gap="xl"
        pos={PINNED}
        bottom="1.5rem"
        left={0}
        right={0}
        mb={{ base: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))", sm: "auto" }}
      >
        <Group align="center" justify="center" gap={4}>
          <Text size="sm" lh={1} c="background.9">
            {type === "register" ? t("auth.haveAccount") : t("auth.noAccount")}
          </Text>
          <Anchor component="button" type="button" lh={1} c="background.9" fw={600} size="md" onClick={auth.switchType}>
            {type === "register" ? t("auth.login") : t("auth.register")}
          </Anchor>
        </Group>
        {type === "login" && <LegalLinks />}
      </Stack>
    </>
  );
}

function LegalLinks(): ReactElement {
  const { t } = useTranslation();
  return (
    <Group gap="xs" justify="center">
      <Anchor component={Link} to="/legal/privacy" size="xs" c="background.9" td="underline">
        {t("page.legalPrivacy")}
      </Anchor>
      <Text size="xs" c="background.9" aria-hidden>
        ·
      </Text>
      <Anchor component={Link} to="/legal/terms" size="xs" c="background.9" td="underline">
        {t("page.legalTerms")}
      </Anchor>
    </Group>
  );
}
