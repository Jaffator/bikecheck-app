import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// Provides native press feedback without relying on desktop vibration support.
export function tapFeedback(): void {
  if (!Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: ImpactStyle.Light });
}
