import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// The native launch splash stays until the first real screen is ready (launchAutoHide: false).
export function useHideLaunchSplash(ready: boolean): void {
  useEffect(() => {
    if (!ready || !Capacitor.isNativePlatform()) return;
    void SplashScreen.hide();
  }, [ready]);
}
