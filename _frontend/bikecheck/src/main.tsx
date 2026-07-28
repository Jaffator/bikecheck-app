import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import "@mantine/core/styles.css";
import "./global.css";
import { theme } from "./theme";
import { queryClient } from "./api/queryClient";
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
      <QueryClientProvider client={queryClient}>
        <AppRouter>
          <App />
        </AppRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
