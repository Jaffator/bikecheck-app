import { Anchor, Button, Checkbox, Divider, Group, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import type { PaperProps } from "@mantine/core";
import { useForm } from "@mantine/form";
import { upperFirst, useToggle } from "@mantine/hooks";
import { GoogleButton } from "./GoogleButton";
import { Mail, Lock } from "lucide-react";
import logoName from "../../assets/logo_name.svg";
import { useLogin } from "../users/users.queries";

export function AuthenticationForm(props: PaperProps) {
  const login = useLogin();
  const [type, toggle] = useToggle(["login", "register"]);
  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
      terms: false,
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      password: (val) => (val.length <= 6 ? "Password should include at least 6 characters" : null),
    },
  });
  return (
    <>
      <img
        src={logoName}
        alt="BikeCheck Logo"
        style={{ width: "100%", maxWidth: "200px", position: "absolute", top: "4rem", left: 0, right: 0, margin: "0 auto" }}
      />
      <Paper w="90%" radius="md" p="lg" mt="4rem" {...props} bg="transparent">
        <form
          onSubmit={form.onSubmit((values) => {
            login.mutate({ email: values.email, password: values.password });
          })}
        >
          <Stack>
            <TextInput
              placeholder="Enter your email"
              leftSection={<Mail size={18} />}
              value={form.values.email}
              onChange={(event) => form.setFieldValue("email", event.currentTarget.value)}
              error={form.errors.email && "Invalid email"}
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
              placeholder="Enter your password"
              leftSection={<Lock size={18} />}
              value={form.values.password}
              onChange={(event) => form.setFieldValue("password", event.currentTarget.value)}
              error={form.errors.password && "Password should include at least 6 characters"}
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
                c="background.5"
                label="I accept terms and conditions"
                checked={form.values.terms}
                onChange={(event) => form.setFieldValue("terms", event.currentTarget.checked)}
              />
            )}
          </Stack>

          <Stack justify="space-between" mt="xl">
            {login.isError && (
              <Text size="sm" c="red.6" ta="center">
                {login.error.status === 401 ? "Invalid email or password" : "Something went wrong, try again"}
              </Text>
            )}
            <Button type="submit" radius="lg" style={{ height: "3rem" }} loading={login.isPending}>
              {upperFirst(type)}
            </Button>
          </Stack>
        </form>
        <Divider
          label="OR"
          labelPosition="center"
          my="lg"
          w="100%"
          mx="auto"
          color="background.9"
          styles={{ label: { color: "var(--mantine-color-background-9)" } }}
        />

        <Stack mb="md" mt="md">
          <GoogleButton variant="filled" bg="background.9" c="text.6" radius="lg" h="3rem">
            Continue with Google
          </GoogleButton>
        </Stack>
      </Paper>
      <Group align="center" justify="center" gap={4} style={{ position: "absolute", bottom: "2rem", left: 0, right: 0 }}>
        <Text size="sm" lh={1} c="background.9">
          {type === "register" ? "Already have an account?" : "Don't have an account?"}
        </Text>
        <Anchor component="button" type="button" lh={1} c="background.9" fw={600} size="md" onClick={() => toggle()}>
          {type === "register" ? "Login" : "Register"}
        </Anchor>
      </Group>
    </>
  );
}
