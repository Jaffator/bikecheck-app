// Placeholder — routing/auth-gate skeleton only. Real form (fields,
// validation, POST /auth/login) is a separate follow-up task.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { AuthenticationForm } from "./Authentication";

// The Android keyboard shrinks the window, so any %/vh/lvh-sized background
// gets squashed with it. Report a px height that only ever grows instead: the
// keyboard can only make the window smaller, so the largest height seen is the
// keyboard-free one. Mounting while the keyboard is already open (vite HMR
// does this) therefore self-corrects as soon as it closes. A width change is
// an orientation change and resets the measurement.
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

export function Login(): ReactElement {
  const pageHeight = useStableViewportHeight();
  return (
    <>
      <Stack className="bg-background-900 relative isolate" align="center" gap="md" py="xl" style={{ minHeight: "100dvh" }}>
        <AuthenticationForm mt="220"></AuthenticationForm>
        {/* Anchored to the top with a fixed px height, so neither edge moves
            when the keyboard shrinks the window. */}
        <div
          className="w-full absolute top-0 left-0 -z-10"
          style={{
            height: pageHeight,
            background: "linear-gradient(to top, var(--mantine-color-primary-6) 10%, transparent 100%)",
            animation: "wave 6s ease-in-out infinite",
          }}
        ></div>
      </Stack>
    </>
  );
}
