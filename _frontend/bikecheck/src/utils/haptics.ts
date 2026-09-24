import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { DESKTOP_QUERY } from "@/layout/breakpoints";

// Provides native press feedback without relying on desktop vibration support.
export function tapFeedback(): void {
  if (!Capacitor.isNativePlatform()) return;
  // A tablet wide enough for the desktop shell is driven like a desktop (ADR 0035).
  if (window.matchMedia(DESKTOP_QUERY).matches) return;
  void Haptics.impact({ style: ImpactStyle.Light });
}
