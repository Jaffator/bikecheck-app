// The login screen from the desktop width: the bike panel on the left, the form in a column on the right.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Anchor, Box, Button, Checkbox, Divider, Group, PasswordInput, Stack, Text, TextInput, Title, type MantineTheme } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Lock, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import logoName from "../../assets/logo_name.svg";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { GoogleButton } from "./GoogleButton";
import { CheckInbox } from "./CheckInbox";
import { FormFeedback, GoogleFeedback } from "./AuthFeedback";
import { LoginBikePanel } from "./LoginBikePanel";
import { MarketingWebsiteLink } from "./MarketingWebsiteLink";
import type { AuthFormState } from "./useAuthForm";

// The form's controls stand taller than the app's: this screen is the front door.
const CONTROL_HEIGHT = "3rem";
const CONTROL_RADIUS = inputStyles.input.borderRadius;

const BASE_FIELD_STYLES = { ...inputStyles, input: { ...inputStyles.input, height: CONTROL_HEIGHT } };
const VISIBILITY_TOGGLE: CSSProperties = { color: "var(--mantine-color-text-8)" };

// The shared input paints its own border over Mantine's, so a field in error asks for the red back.
function fieldStyles(_theme: MantineTheme, { error }: { error?: ReactNode }): typeof BASE_FIELD_STYLES {
  if (!error) return BASE_FIELD_STYLES;
  return { ...BASE_FIELD_STYLES, input: { ...BASE_FIELD_STYLES.input, borderColor: "var(--mantine-color-error)" } };
}

function passwordStyles(theme: MantineTheme, props: { error?: ReactNode }): typeof BASE_FIELD_STYLES & { visibilityToggle: CSSProperties } {
  return { ...fieldStyles(theme, props), visibilityToggle: VISIBILITY_TOGGLE };
}

function Heading({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const isLogin = auth.type === "login";
  return (
    <Stack gap={10}>
      <Title order={1} fz={32} lh={1.15} fw={600} lts="var(--tracking-display)" c="text.1">
        {isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}
      </Title>
      <Text fz={15} lh={1.5} c="text.8">
        {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Anchor component="button" type="button" fz={15} fw={600} c="primary.6" underline="hover" onClick={auth.switchType}>
          {isLogin ? t("auth.register") : t("auth.login")}
        </Anchor>
      </Text>
    </Stack>
  );
}

function TermsCheckbox({ auth }: { auth: AuthFormState }): ReactElement {
  const { form } = auth;
  return (
    <Checkbox
      c="text.7"
      styles={{
        body: { alignItems: "center" },
        // Only the unticked box is painted, so the theme's fill still draws a ticked one.
        input: form.values.terms ? undefined : { backgroundColor: "var(--mantine-color-cards-7)", borderColor: "var(--mantine-color-inputs-5)" },
      }}
      label={
        <Trans
          i18nKey="auth.acceptTerms"
          components={{ 1: <Anchor component={Link} to="/legal/terms" c="primary.6" fw={600} /> }}
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
    <Stack gap={16}>
      {type === "register" && (
        <TextInput
          label={t("auth.nameLabel")}
          placeholder={t("auth.namePlaceholder")}
          leftSection={<User size={18} />}
          styles={fieldStyles}
          {...form.getInputProps("name")}
        />
      )}
      <TextInput
        label={t("auth.emailLabel")}
        placeholder={t("auth.emailPlaceholder")}
        leftSection={<Mail size={18} />}
        styles={fieldStyles}
        {...form.getInputProps("email")}
      />
      <PasswordInput
        label={t("auth.passwordLabel")}
        placeholder={t("auth.passwordPlaceholder")}
        leftSection={<Lock size={18} />}
        styles={passwordStyles}
        {...form.getInputProps("password")}
      />
      {type === "register" && (
        <PasswordInput
          label={t("auth.confirmPasswordLabel")}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          leftSection={<Lock size={18} />}
          styles={passwordStyles}
          {...form.getInputProps("confirmPassword")}
        />
      )}
      {type === "register" && <TermsCheckbox auth={auth} />}
    </Stack>
  );
}

function DesktopForm({ auth }: { auth: AuthFormState }): ReactElement {
  const { t } = useTranslation();
  const { type, login, registration } = auth;
  return (
    <Stack gap={32}>
      <Heading auth={auth} />
      <Stack gap={20}>
        <form onSubmit={auth.submit}>
          <Stack gap={20}>
            <Fields auth={auth} />
            <FormFeedback auth={auth} accent="primary.6" />
            <Button
              type="submit"
              h={CONTROL_HEIGHT}
              radius={CONTROL_RADIUS}
              fz={15}
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
          color="inputs.5"
          styles={{ label: { color: "var(--mantine-color-text-8)", fontSize: 12, fontWeight: 500, letterSpacing: "var(--tracking-label)" } }}
        />
        <GoogleButton variant="outline" h={CONTROL_HEIGHT} radius={CONTROL_RADIUS} fz={15} onClick={() => auth.signInWithGoogle()}>
          {t("auth.continueWithGoogle")}
        </GoogleButton>
        <GoogleFeedback auth={auth} />
      </Stack>
    </Stack>
  );
}

function LegalLinks(): ReactElement {
  const { t } = useTranslation();
  return (
    <Group gap="8px 12px" justify="center">
      <Anchor component={Link} to="/legal/privacy" fz={13} c="text.8">
        {t("page.legalPrivacy")}
      </Anchor>
      <Text fz={13} c="text.8" aria-hidden>
        ·
      </Text>
      <Anchor component={Link} to="/legal/terms" fz={13} c="text.8">
        {t("page.legalTerms")}
      </Anchor>
    </Group>
  );
}

export function DesktopAuth({ auth }: { auth: AuthFormState }): ReactElement {
  const { inboxEmail } = auth;
  return (
    <Box bg="background.9" className="auth-enter flex min-h-dvh">
      <LoginBikePanel />
      {/* About a third of the screen, so a wide monitor gives the form air on both sides. */}
      <div className="flex flex-[0_0_clamp(480px,32vw,640px)] box-border" style={{ padding: "40px clamp(24px, 5vw, 64px)" }}>
        {/* One left edge for the form; logo and footer sit centred around it. */}
        <Box w="100%" maw={380} mx="auto" className="flex flex-col justify-between gap-12">
          <div className="flex flex-1 flex-col justify-center gap-10">
            <MarketingWebsiteLink className="mb-20 self-center">
              <img src={logoName} alt="BikeCheck" className="block h-[57px] w-auto" />
            </MarketingWebsiteLink>
            {/* Registration and a refused Google sign-in end here until the link is used (ADR 0031). */}
            {inboxEmail !== null ? (
              <CheckInbox email={inboxEmail} onBackToLogin={auth.backToLogin} />
            ) : (
              <DesktopForm auth={auth} />
            )}
          </div>
          <LegalLinks />
        </Box>
      </div>
    </Box>
  );
}
