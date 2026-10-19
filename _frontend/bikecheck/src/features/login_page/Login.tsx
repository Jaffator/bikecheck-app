// Login page shell.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { App } from "@capacitor/app";
import { useIsDesktop } from "@/layout/breakpoints";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { PhoneAuth } from "./PhoneAuth";
import { DesktopAuth } from "./DesktopAuth";
import { useAuthForm, type AuthFormState } from "./useAuthForm";

// Keep background height stable while the keyboard is open.
function useStableViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight);

  useEffect(() => {
    let lastWidth = window.innerWidth;

    function onResize(): void {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        setHeight(window.innerHeight);
        return;
      }
      setHeight((current) => Math.max(current, window.innerHeight));
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return height;
}

function PhoneLogin({ auth }: { auth: AuthFormState }): ReactElement {
  const pageHeight = useStableViewportHeight();
  return (
    <Stack
      className="bg-background-900 auth-enter relative isolate"
      align="center"
      gap="md"
      py="xl"
      style={{ minHeight: "100dvh" }}
    >
      <PhoneAuth auth={auth} />
      {/* Keep the background stable during keyboard resize. */}
      <div
        className="w-full absolute top-0 left-0 -z-10"
        style={{
          height: pageHeight,
          background: "linear-gradient(to top, var(--mantine-color-primary-6) 10%, transparent 80%)",
          animation: "wave 6s ease-in-out infinite",
        }}
      ></div>
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
