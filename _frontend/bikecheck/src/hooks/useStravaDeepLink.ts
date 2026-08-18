import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// The scheme registered in AndroidManifest.xml. The Strava OAuth callback
// redirects the phone's browser here, which brings the app back to the front.
// Matched on the path alone, not the whole URL: the backend joins its configured
// base ("bikecheck://") with the path, which can leave a third slash behind.
const STRAVA_CONNECTED_PATH = "strava-connected";
const STRAVA_CONNECTED_ROUTE = "/strava-connected";

// Closes the OAuth tab and refreshes the user once Strava has been linked.
// The link itself is stored by the backend during the callback — the app only
// has to notice it happened, which is why nothing here reads the URL's params.
export function useStravaDeepLink(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", (event) => {
      if (!event.url.includes(STRAVA_CONNECTED_PATH)) return;

      // The tab is still open behind the app — closing it is what makes the
      // return feel like the app was never left.
      void Browser.close();
      // strava_athlete_id now sits on the user, so whoever reads it re-fetches.
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      // The deep link never reaches the router on its own — Capacitor delivers
      // it here instead of to history, so the confirmation has to be navigated
      // to by hand. replace: the OAuth round trip is not a step to go back to.
      navigate(STRAVA_CONNECTED_ROUTE, { replace: true });
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [queryClient, navigate]);
}
