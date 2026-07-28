// Placeholder — routing/auth-gate skeleton only. Real form (fields,
// validation, POST /auth/login) is a separate follow-up task.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { AuthenticationForm } from "./Authentication";

export function Login(): ReactElement {
  return (
    <>
      <Stack
        className="bg-background-900 relative isolate"
        align="center"
        justify="center"
        gap="md"
        py="xl"
        style={{ minHeight: "100dvh" }}
      >
        <AuthenticationForm></AuthenticationForm>
        <div
          className="w-full h-[110dvh] absolute bottom-0 left-0 -z-10"
          style={{
            background: "linear-gradient(to top, var(--mantine-color-primary-6) 0%, transparent 78%)",
            animation: "wave 6s ease-in-out infinite",
          }}
        ></div>
      </Stack>
    </>
  );
}
