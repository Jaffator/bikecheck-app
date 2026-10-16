import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bikecheck.app",
  appName: "BikeCheck",
  webDir: "dist",
  plugins: {
    EdgeToEdge: {
      backgroundColor: "#151515", // Transparent — obsah/floating nav teď prosvítá až do gesture baru
    },
    Keyboard: {
      resizeOnFullScreen: false,
    },
    android: {
      adjustMarginsForEdgeToEdge: "force",
    },
  },
};

export default config;
