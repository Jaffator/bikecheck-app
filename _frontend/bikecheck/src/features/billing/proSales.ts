import { Capacitor } from "@capacitor/core";

export type ProPlatform = "web" | "android";

// Nothing can be bought yet: a production build never sells, whatever the switch says.
export const PRO_SALES = import.meta.env.DEV && import.meta.env.VITE_PRO_SALES === "true";

export const PRO_PRICE = "49 Kč";

// Who takes the payment. Development can look at the other one.
export const PRO_PLATFORM: ProPlatform = chosenPlatform() ?? (Capacitor.isNativePlatform() ? "android" : "web");

// Google Play has its own step for it.
export const NEEDS_CONSENT = PRO_PLATFORM === "web";

function chosenPlatform(): ProPlatform | null {
  if (!PRO_SALES) return null;
  const chosen = import.meta.env.VITE_PRO_PLATFORM;
  return chosen === "web" || chosen === "android" ? chosen : null;
}
