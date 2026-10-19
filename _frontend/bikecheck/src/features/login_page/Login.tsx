// Login page shell.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { App } from "@capacitor/app";
import { useIsDesktop } from "@/layout/breakpoints";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { PhoneAuth } from "./PhoneAuth";
import { DesktopAuth } from "./DesktopAuth";
import { useAuthForm, type AuthFormState } from "./useAuthForm";

function PhoneLogin({ auth }: { auth: AuthFormState }): ReactElement {
  return (
    <Stack className="bg-background-900 auth-enter relative isolate" align="center" gap="md" py="xl" style={{ minHeight: "100dvh" }}>
      <PhoneAuth auth={auth} />
    </Stack>
  );
}

export function Login(): ReactElement {
  // Held above both layouts, so resizing across the desktop width keeps what was typed.
  const auth = useAuthForm();
  // Without a listener Capacitor's back does nothing here, so leave the App as Home does.
  useAndroidBackButton(() => void App.minimizeApp());
  return useIsDesktop() ? <DesktopAuth auth={auth} /> : <PhoneLogin auth={auth} />;
}
