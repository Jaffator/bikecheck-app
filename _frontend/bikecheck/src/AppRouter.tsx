import type { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Native static hosting requires hash routes while web deployments use clean URLs.
export function AppRouter({ children }: { children: ReactNode }) {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
}
