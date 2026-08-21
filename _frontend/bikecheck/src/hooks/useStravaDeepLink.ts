import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// Matches the Strava OAuth callback path registered by the native shell.
const STRAVA_CONNECTED_PATH = "strava-connected";
const STRAVA_CONNECTED_ROUTE = "/strava-connected";

// Closes completed OAuth and refreshes account state after Strava linking.
export function useStravaDeepLink(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", (event) => {
      if (!event.url.includes(STRAVA_CONNECTED_PATH)) return;

      // Closes the OAuth tab remaining behind the app.
      void Browser.close();
      // Refreshes the current user with the linked athlete ID.
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      // Replaces history with the deep-link confirmation route.
      navigate(STRAVA_CONNECTED_ROUTE, { replace: true });
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [queryClient, navigate]);
}
