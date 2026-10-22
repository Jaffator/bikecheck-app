import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "bikecheck.app",
  appName: "BikeCheck",
  webDir: "dist",
  // The WebView's colour before its first paint: the loading screen's background.9.
  backgroundColor: "#0a0a0b",
  plugins: {
    // App.tsx hides it once the first screen is ready, so it fades straight into the app.
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 300,
    },
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
