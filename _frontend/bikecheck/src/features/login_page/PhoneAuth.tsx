// The login screen below the desktop width: the form on black, pinned against the keyboard.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  type MantineTheme,
} from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Mail, Lock, User } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import logoName from "../../assets/logo_name.svg";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { GoogleButton } from "./GoogleButton";
import { MarketingWebsiteLink } from "./MarketingWebsiteLink";
import { CheckInbox } from "./CheckInbox";
import { ErrorLine, FormFeedback, GoogleFeedback } from "./AuthFeedback";
import { AUTH_ERROR_STYLE, ERROR_TEXT_COLOR, FIELD_ERROR_STYLE } from "./authErrorStyles";
import type { AuthFormState } from "./useAuthForm";

// The native app sits under a status bar the web page does not, so the block starts lower.
const NATIVE_SHIFT_PX = Capacitor.isNativePlatform() ? 50 : 0;
const LOGO_TOP = `calc(16px + ${String(NATIVE_SHIFT_PX)}px)`;
const REGISTER_FORM_TOP = `calc(32px + ${String(NATIVE_SHIFT_PX)}px)`;
// Registration is too long to centre, so a phone pins its logo to the top; the footer is pinned
// to the bottom in both. From sm up everything flows as one block, centred by the auto margins.
const PINNED = { base: "absolute", sm: "static" } as const;
// Room for the pinned footer above the system nav bar, so a long form scrolls instead of running under it.
const FOOTER_RESERVE = "calc(4.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";
// The auto bottom margin pairs with the logo's top one to centre the block on a phone; the
// padding keeps the pinned footer out of that space, so it centres in what is left above it.
const CENTRED_FORM_MARGINS = {
  mt: { base: "2rem", sm: 0 },
  mb: { base: "auto", sm: 0 },
  pb: { base: FOOTER_RESERVE, sm: 0 },
};
const REGISTER_FORM_MARGINS = { mt: { base: REGISTER_FORM_TOP, sm: 0 }, mb: { base: FOOTER_RESERVE, sm: 0 } };
// The form's width on a wide screen: a single column of inputs, not the whole page.
const FORM_MAX_WIDTH = "26rem";

const FIELD_HEIGHT = 40;
const CONTROL_HEIGHT = 44;
const CONTROL_RADIUS = 12;
const PASSWORD_ID = "auth-password";
const ERROR_RING = "0 0 0 3px color-mix(in srgb, var(--mantine-color-red-8) 18%, transparent)";

// Mantine's styles are inline, so the frame goes through its vars and :focus can still swap it.
const FIELD_VARS = {
  "--input-bg": "var(--mantine-color-inputs-6)",
  "--input-color": "var(--mantine-color-text-6)",
  "--input-placeholder-color": "var(--mantine-color-text-9)",
} as CSSProperties;
const FIELD_FRAME = {
  "--input-bd": "var(--color-border-strong)",
  "--input-section-color": "var(--mantine-color-text-8)",
} as CSSProperties;
// The border is left to Mantine's red.
const ERROR_FRAME = { "--input-section-color": ERROR_TEXT_COLOR } as CSSProperties;

function fieldStyles(_theme: MantineTheme, { error }: { error?: ReactNode }): Record<string, CSSProperties> {
  return {
    wrapper: { ...FIELD_VARS, ...(error ? ERROR_FRAME : FIELD_FRAME) },
    label: { fontSize: 12, fontWeight: 500, color: "var(--mantine-color-text-7)", marginBottom: 2 },
    input: { height: FIELD_HEIGHT, borderRadius: CONTROL_RADIUS, fontSize: 16, boxShadow: error ? ERROR_RING : undefined },
    error: FIELD_ERROR_STYLE,
    visibilityToggle: { color: "var(--mantine-color-text-8)" },
  };
}

const FIELD_PROPS = { leftSectionWidth: 44, styles: fieldStyles, classNames: { input: "auth-field" } };

// Centred, the logo flows above the form and its auto margin takes half the free space.
// Pinned, it shrinks into the top-left corner and the form's own title leads instead.
function Logo({ centred }: { centred: boolean }): ReactElement {
  return (
    <Box
      w="100%"
      maw={centred ? 160 : { base: 96, sm: 160 }}
      mx={centred ? "auto" : { base: 0, sm: "auto" }}
      pos={centred ? "static" : PINNED}
      top={LOGO_TOP}
      left={centred ? 0 : 24}
      mt={centred ? "auto" : { base: 0, sm: "auto" }}
    >
      <MarketingWebsiteLink className="block">
        <img src={logoName} alt="BikeCheck Logo" className="block w-full" />
      </MarketingWebsiteLink>
    </Box>
  );
}

function PasswordField({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { passwordError } = auth;
  const isLogin = auth.type === "login";
  const field = (
    <PasswordInput
      id={PASSWORD_ID}
      label={isLogin ? undefined : t("auth.passwordLabel")}
      placeholder={isLogin ? t("auth.passwordPlaceholder") : t("auth.newPasswordPlaceholder")}
      leftSection={<Lock size={18} />}
      {...FIELD_PROPS}
      {...auth.form.getInputProps("password")}
      error={passwordError && <ErrorLine>{passwordError}</ErrorLine>}
    />
  );
  if (!isLogin) return field;

  // The label stands apart so the link beside it is not part of the <label>.
  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text component="label" htmlFor={PASSWORD_ID} fz={13} fw={500} c="text.7">
          {t("auth.passwordLabel")}
        </Text>
        {/* Hidden until password reset exists. The negative margin keeps its tap padding off the row.
        <Anchor component="button" type="button" fz={13} fw={500} c="primary.6" py={6} my={-6}>
          {t("auth.forgotPassword")}
        </Anchor> */}
      </Group>
      {field}
    </Stack>
  );
}

function TermsCheckbox({ auth }: { auth: AuthFormState }): ReactElement {
  const { form } = auth;
  return (
    <Checkbox
      size="md"
      c="text.7"
      styles={{
        body: { alignItems: "center", minHeight: 36 },
        label: { fontSize: 14, lineHeight: 1.4 },
        // Only the unticked box is painted, so the theme's fill still draws a ticked one.
        input: form.values.terms
          ? undefined
          : { backgroundColor: "var(--mantine-color-inputs-6)", borderColor: "var(--color-border-strong)" },
      }}
      // The document the box is agreeing to, one tap away and open to a visitor with no account yet.
      label={
        <Trans
          i18nKey="auth.acceptTerms"
          components={{ 1: <Anchor component={Link} to="/legal/terms" fz="inherit" c="primary.6" td="underline" /> }}
        />
      }
      checked={form.values.terms}
      onChange={(event) => form.setFieldValue("terms", event.currentTarget.checked)}
    />
  );
}

function Fields({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { form, type } = auth;
  return (
    <Stack gap={type === "register" ? 4 : 8}>
      {type === "register" && (
        <TextInput
          label={t("auth.nameLabel")}
          placeholder={t("auth.namePlaceholder")}
          leftSection={<User size={18} />}
          {...FIELD_PROPS}
          {...form.getInputProps("name")}
          error={form.errors.name && <ErrorLine>{form.errors.name}</ErrorLine>}
        />
      )}
      <TextInput
        label={t("auth.emailLabel")}
        placeholder={t("auth.emailPlaceholder")}
        leftSection={<Mail size={18} />}
        {...FIELD_PROPS}
        {...form.getInputProps("email")}
        error={form.errors.email && <ErrorLine>{form.errors.email}</ErrorLine>}
      />
      <PasswordField auth={auth} />
      {type === "register" && (
        <PasswordInput
          label={t("auth.confirmPasswordLabel")}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          leftSection={<Lock size={18} />}
          {...FIELD_PROPS}
          {...form.getInputProps("confirmPassword")}
          error={form.errors.confirmPassword && <ErrorLine>{form.errors.confirmPassword}</ErrorLine>}
        />
      )}
      {type === "register" && <TermsCheckbox auth={auth} />}
    </Stack>
  );
}

function Footer({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const isLogin = auth.type === "login";
  return (
    <Stack
      align="center"
      gap={4}
      pos={PINNED}
      bottom={0}
      left={0}
      right={0}
      mb={{ base: "calc(0.25rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))", sm: "auto" }}
    >
      <Group align="center" justify="center" gap={6}>
        <Text fz={14} c="text.7">
          {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}
        </Text>
        <Anchor component="button" type="button" fz={14} fw={600} c="primary.6" py={8} onClick={auth.switchType}>
          {isLogin ? t("auth.register") : t("auth.login")}
        </Anchor>
      </Group>
      <LegalLinks />
    </Stack>
  );
}

export function PhoneAuth({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { type, login, registration } = auth;
  // Keep focused fields above the keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>();

  // Registration and a refused Google sign-in end here, not in the app: the account cannot
  // sign in until the link in the Verification Email is used (ADR 0031).
  if (auth.inboxEmail !== null) {
    return (
      <>
        <Logo centred />
        <Box w="100%" maw={FORM_MAX_WIDTH} px={24} mt={{ base: "1rem", sm: 0 }} mb="auto">
          <CheckInbox email={auth.inboxEmail} onBackToLogin={auth.backToLogin} />
        </Box>
      </>
    );
  }

  const centred = type === "login";
  return (
    <>
      <Logo centred={centred} />
      <Box
        w="100%"
        maw={FORM_MAX_WIDTH}
        px={24}
        {...(centred ? CENTRED_FORM_MARGINS : REGISTER_FORM_MARGINS)}
        ref={formRef}
        style={AUTH_ERROR_STYLE}
      >
        <Title order={1} fz={20} fw={700} lts="var(--tracking-title)" c="text.6" mb={6}>
          {centred ? t("auth.loginTitle") : t("auth.registerTitle")}
        </Title>
        <form onSubmit={auth.submit}>
          <Stack gap={8}>
            <Fields auth={auth} />
            <FormFeedback auth={auth} />
            <Button
              type="submit"
              mt={centred ? 15 : 12}
              h={CONTROL_HEIGHT}
              radius={CONTROL_RADIUS}
              fz={16}
              fw={600}
              lts="var(--tracking-title)"
              c="textDark.6"
              loading={login.isPending || registration.isPending}
            >
              {type === "login" ? t("auth.login") : t("auth.register")}
            </Button>
          </Stack>
        </form>
        <Divider
          label={t("auth.or")}
          labelPosition="center"
          my={9}
          color="var(--color-border-strong)"
          styles={{ label: { color: "var(--mantine-color-text-8)", fontSize: 12, letterSpacing: "var(--tracking-label)" } }}
        />
        <Stack gap={12}>
          <GoogleButton
            variant="outline"
            h={CONTROL_HEIGHT}
            radius={CONTROL_RADIUS}
            fz={15}
            fw={600}
            onClick={() => auth.signInWithGoogle()}
          >
            {t("auth.continueWithGoogle")}
          </GoogleButton>
          <GoogleFeedback auth={auth} />
        </Stack>
      </Box>
      <Footer auth={auth} />
    </>
  );
}

function LegalLinks(): ReactElement {
  const { t } = useTranslation();
  return (
    <Group gap={10} justify="center">
      <Anchor component={Link} to="/legal/privacy" fz={12} c="text.8" td="underline" py={8}>
        {t("page.legalPrivacy")}
      </Anchor>
      <Text fz={12} c="text.8" aria-hidden>
        ·
      </Text>
      <Anchor component={Link} to="/legal/terms" fz={12} c="text.8" td="underline" py={8}>
        {t("page.legalTerms")}
      </Anchor>
    </Group>
  );
}
