import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// Press feedback for tab bar and FAB taps. Native only — the web implementation
// depends on the vibration API, which desktop browsers do not have.
export function tapFeedback(): void {
  if (!Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: ImpactStyle.Light });
}
