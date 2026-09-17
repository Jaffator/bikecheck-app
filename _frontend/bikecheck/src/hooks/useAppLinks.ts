import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";

// Matches the App Link path registered by the native shell (AndroidManifest.xml).
const VERIFY_EMAIL_PATH = "/verify-email";

// Lands the Verification Email's App Link on the in-app verify page (ADR 0031). Mounted
// outside the auth gate: the link arrives while nobody is signed in. A cold start is
// covered too - Android retains the launch URL until the first listener registers.
export function useVerifyEmailAppLink(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", (event) => {
      const route = toVerifyEmailRoute(event.url);
      if (route === null) return;

      // Replaces history: the link's page is nothing to come back to.
      navigate(route, { replace: true });
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
}

// The in-app route for a verification link, token preserved; null for any other URL.
function toVerifyEmailRoute(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.pathname !== VERIFY_EMAIL_PATH) return null;

  return `${VERIFY_EMAIL_PATH}${parsed.search}`;
}
