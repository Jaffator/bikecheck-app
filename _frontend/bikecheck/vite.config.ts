import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Listen on all network interfaces (0.0.0.0), not just localhost,
    // so the LAN IP in .env (VITE_API_BASE_URL) is reachable — needed
    // for the Android emulator/device and for cookie same-site testing.
    host: true,
  },
});
