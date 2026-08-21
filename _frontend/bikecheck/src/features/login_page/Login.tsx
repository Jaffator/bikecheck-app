// Login page shell.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { AuthenticationForm } from "./Authentication";

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

export function Login(): ReactElement {
  const pageHeight = useStableViewportHeight();
  return (
    <>
      <Stack className="bg-background-900 relative isolate" align="center" gap="md" py="xl" style={{ minHeight: "100dvh" }}>
        <AuthenticationForm mt="220"></AuthenticationForm>
        {/* Keep the background stable during keyboard resize. */}
        <div
          className="w-full absolute top-0 left-0 -z-10"
          style={{
            height: pageHeight,
            background: "linear-gradient(to top, var(--mantine-color-primary-6) 10%, transparent 95%)",
            animation: "wave 6s ease-in-out infinite",
          }}
        ></div>
      </Stack>
    </>
  );
}
