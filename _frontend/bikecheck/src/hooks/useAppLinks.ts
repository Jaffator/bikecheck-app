import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { LOGIN_EMAIL_PARAM } from "@/features/login_page/Authentication";

// The App Link path registered by the native shell (AndroidManifest.xml).
const VERIFY_EMAIL_PATH = "/verify-email";
// The custom-scheme host the web verify page hands off to: bikecheck://login?email=…
const LOGIN_HOST = "login";

// Routes links opened into the app (ADR 0031). Mounted outside the auth gate: they arrive
// while nobody is signed in. A cold start is covered - Android retains the launch URL.
export function useAppLinks(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", (event) => {
      const route = toRoute(event.url);
      if (route === null) return;
      // The link's page is nothing to come back to.
      navigate(route, { replace: true });
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
}

// The in-app route for a link, or null for any other URL.
function toRoute(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // https://bikecheck.cloud/verify-email?token=… - the Verification Email's App Link.
  if (parsed.pathname === VERIFY_EMAIL_PATH) return `${VERIFY_EMAIL_PATH}${parsed.search}`;

  // bikecheck://login?email=… - the web verify page sending a verified rider to sign in.
  if (parsed.protocol === "bikecheck:" && parsed.host === LOGIN_HOST) {
    const email = parsed.searchParams.get(LOGIN_EMAIL_PARAM);
    return email === null ? "/" : `/?${LOGIN_EMAIL_PARAM}=${encodeURIComponent(email)}`;
  }

  return null;
}
