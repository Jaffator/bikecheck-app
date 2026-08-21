import { Anchor, Button, Checkbox, Divider, Group, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import type { PaperProps } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useToggle } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { detectLanguage } from "@/i18n";
import { GoogleButton } from "./GoogleButton";
import { Mail, Lock, User } from "lucide-react";
import logoName from "../../assets/logo_name.svg";
import { useLogin, useRegistration, useGoogleNative } from "../users/users.queries";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

export function AuthenticationForm(props: PaperProps) {
  const { t } = useTranslation();
  const login = useLogin();
  const registration = useRegistration();
  const googleToken = useGoogleNative();
  const [type, toggle] = useToggle(["login", "register"]);
  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
      terms: false,
    },

    validate: {
      name: (val) => (type === "register" && val.trim().length === 0 ? t("auth.nameRequired") : null),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : t("auth.invalidEmail")),
      password: (val) => (val.length < 8 ? t("auth.passwordTooShort") : null),
      terms: (val) => (type === "register" && !val ? t("auth.termsRequired") : null),
    },
  });

  // Clear state from the previous form mode.
  function switchType(): void {
    toggle();
    form.clearErrors();
    login.reset();
    registration.reset();
  }

  async function handleGoogleSignIn(): Promise<void> {
    if (Capacitor.getPlatform() === "web") {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
    } else if (Capacitor.getPlatform() === "android") {
      const result = await GoogleSignIn.signIn();
      console.log("Google sign-in result:", result);
      googleToken.mutate({ idToken: result.idToken });
    }
  }

  return (
    <>
      <img
        src={logoName}
        alt="BikeCheck Logo"
        style={{ width: "100%", maxWidth: "200px", position: "absolute", top: "6rem", left: 0, right: 0, margin: "0 auto" }}
      />
      <Paper w="90%" radius="md" p="lg" mt="4rem" {...props} bg="transparent">
        <form
          // Submit the active form.
          onSubmit={form.onSubmit((values) => {
            if (type === "login") {
              login.mutate({ email: values.email, password: values.password });
            } else {
              // Sign in after successful registration.
              registration.mutate(
                { name: values.name, email: values.email, password: values.password, language: detectLanguage() },
                {
                  onSuccess: () => {
                    login.mutate({ email: values.email, password: values.password });
                  },
                },
              );
            }
          })}
        >
          <Stack>
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
                    height: "3rem",
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
                  height: "3rem",
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
                  height: "3rem",
                  color: "var(--mantine-color-text-6)",
                },
                visibilityToggle: { color: "var(--mantine-color-text-8)" },
              }}
            />

            {type === "register" && (
              <Checkbox
                ml="2px"
                c="background.9"
                label={t("auth.acceptTerms")}
                checked={form.values.terms}
                onChange={(event) => form.setFieldValue("terms", event.currentTarget.checked)}
              />
            )}
          </Stack>

          <Stack justify="space-between" mt="xl">
            {login.isError && (
              <Text size="sm" c="red.6" ta="center">
                {login.error.status === 401 ? t("auth.invalidCredentials") : t("auth.genericError")}
              </Text>
            )}
            {registration.isError && (
              <Text size="sm" c="red.6" ta="center">
                {registration.error.status === 409 ? t("auth.emailTaken") : t("auth.genericError")}
              </Text>
            )}
            {form.errors.terms && (
              <Text size="sm" c="red.6" ta="center">
                {form.errors.terms}
              </Text>
            )}

            <Button type="submit" radius="lg" style={{ height: "3rem" }} loading={login.isPending || registration.isPending}>
              {type === "login" ? t("auth.login") : t("auth.register")}
            </Button>
          </Stack>
        </form>
        <Divider
          label={t("auth.or")}
          labelPosition="center"
          my="lg"
          w="100%"
          mx="auto"
          color="background.9"
          styles={{ label: { color: "var(--mantine-color-background-9)" } }}
        />

        <Stack mb="md" mt="md">
          <GoogleButton
            onClick={() => handleGoogleSignIn()}
            variant="filled"
            bg="background.9"
            c="text.6"
            radius="lg"
            h="3rem"
          >
            {t("auth.continueWithGoogle")}
          </GoogleButton>
        </Stack>
      </Paper>
      <Group
        align="center"
        justify="center"
        gap={4}
        style={{ position: "absolute", bottom: "1.5rem", left: 0, right: 0 }}
        mb="calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
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
