(window as unknown as { __errs: string[] }).__errs = []; window.addEventListener("error", (e) => (window as unknown as { __errs: string[] }).__errs.push(String(e.message))); window.addEventListener("unhandledrejection", (e) => (window as unknown as { __errs: string[] }).__errs.push("REJ " + String(e.reason)));
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/notifications/styles.css";
import "@/global.css";
import "@/i18n";
import { theme } from "@/theme";
import { queryClient } from "@/api/queryClient";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { Dashboard } from "@/features/dashboard_page/Dashboard";
import { BikeDetail } from "@/features/bikes_page/BikeDetail";
import { MOCKS } from "./store381.mocks";

(window as unknown as { __calls: string[] }).__calls = [];
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "");
  const method = (init?.method ?? "GET").toUpperCase();
  if (!url.includes("/api/") && !url.startsWith("/")) return realFetch(input, init);
  for (const [pattern, body] of MOCKS) {
    if (pattern.test(`${method} ${path}`)) return new Response(JSON.stringify(typeof body === "function" ? body(path) : body), { status: 200, headers: { "content-type": "application/json" } });
  }
  (window as unknown as { __calls: string[] }).__calls.push(`${method} ${path}`);
  if (url.includes("/api/")) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
  return realFetch(input, init);
};
document.documentElement.style.setProperty("--safe-area-inset-top", "30px");
document.documentElement.style.setProperty("--safe-area-inset-bottom", "20px");
const route = new URLSearchParams(location.search).get("route") ?? "/";

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme}><QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[route]}>
    <Loc /><Routes><Route path="*" element={<div id="star">star</div>} /><Route element={<AppLayout />}><Route path="/" element={<Dashboard />} /><Route path="/bikes/:id" element={<BikeDetail />} /></Route></Routes>
  </MemoryRouter></QueryClientProvider></MantineProvider>,
);
import { useLocation } from "react-router-dom";
function Loc() { const l = useLocation(); return <div id="alive">{`loc=${l.pathname}`}</div>; }
