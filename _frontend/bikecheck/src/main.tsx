import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import "./global.css";
import { theme } from "./theme";
import { queryClient } from "./api/queryClient";
import { AppRouter } from "./AppRouter";
import App from "./App.tsx";

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
