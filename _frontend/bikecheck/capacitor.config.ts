import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bikecheck.app",
  appName: "BikeCheck",
  webDir: "dist",
  // Standalone build: no server.url, so the WebView loads the bundled dist/
  // assets locally instead of a remote dev server. Uncomment for live-reload
  // dev testing again.
  server: {
    url: "http://192.168.1.111:5173",
    cleartext: true,
  },
  plugins: {
    EdgeToEdge: {
      backgroundColor: "#151515", // Transparent — obsah/floating nav teď prosvítá až do gesture baru
    },
  },
};

export default config;
