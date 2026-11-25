import { Capacitor } from "@capacitor/core";

export type ProPlatform = "web" | "android";

const { VITE_PRO_PLATFORM } = import.meta.env;

// Nothing can be bought yet: a production build never sells, whatever the switch says.
export const PRO_SALES = import.meta.env.DEV && import.meta.env.VITE_PRO_SALES === "true";

export const PRO_PRICE = "49 Kč";

// Who takes the payment. Development can look at the other one.
export const PRO_PLATFORM: ProPlatform = chosenPlatform() ?? (Capacitor.isNativePlatform() ? "android" : "web");

function chosenPlatform(): ProPlatform | null {
  if (!PRO_SALES) return null;
  return VITE_PRO_PLATFORM === "web" || VITE_PRO_PLATFORM === "android" ? VITE_PRO_PLATFORM : null;
}
