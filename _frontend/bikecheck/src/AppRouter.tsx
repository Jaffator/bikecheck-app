import type { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Native shell (Capacitor) serves dist/ as static files with no server to
// fall back to index.html on sub-paths, so routes must live after "#"
// there. A real web deploy has no such restriction, so it gets clean URLs.
export function AppRouter({ children }: { children: ReactNode }) {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
}
