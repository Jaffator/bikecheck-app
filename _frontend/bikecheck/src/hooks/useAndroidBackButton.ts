import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Android hardware/gesture back. Capacitor itself has no back handling, so without
// this listener the system back finishes the activity and closes the app.
export function useAndroidBackButton(onBack: () => void): void {
  const handler = useRef(onBack);

  useEffect(() => {
    handler.current = onBack;
  }, [onBack]);

  // Registered once — the ref keeps the listener pointed at the latest closure.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => handler.current());

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
}
