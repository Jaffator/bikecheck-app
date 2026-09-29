import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import "@mantine/core/styles.css";
// The date picker in the history's period filter draws nothing without its own styles.
import "@mantine/dates/styles.css";
// Home's charts lay out their tooltip from it.
import "@mantine/charts/styles.css";
// Toasts, such as the Strava sync result.
import "@mantine/notifications/styles.css";
import "./global.css";
// Initializes i18next before the first render.
import "./i18n";
import { theme } from "./theme";
import { queryClient } from "@/api/queryClient";
import { AppRouter } from "./AppRouter";
import App from "./App.tsx";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

const initialize = async () => {
  await GoogleSignIn.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  });
};
initialize();

if (Capacitor.isNativePlatform()) {
  void EdgeToEdge.disable();
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="bottom-right" />
      <QueryClientProvider client={queryClient}>
        <AppRouter>
          <App />
        </AppRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
