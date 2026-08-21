import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Handles Android hardware and gesture back without closing the activity.
export function useAndroidBackButton(onBack: () => void): void {
  const handler = useRef(onBack);

  useEffect(() => {
    handler.current = onBack;
  }, [onBack]);

  // Registers once while the ref retains the latest callback.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => handler.current());

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
}
