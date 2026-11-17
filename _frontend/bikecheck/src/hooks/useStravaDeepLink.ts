import { useCallback, useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

// Matches the Strava OAuth callback path registered by the native shell.
const STRAVA_CONNECTED_PATH = "strava-connected";
const STRAVA_CONNECTED_ROUTE = "/strava-connected";
// The athlete declined on Strava's page; the screen they connected from is still underneath.
const STRAVA_DENIED_PATH = "strava-denied";
// The athlete unticked a permission; the grant was revoked and they are told why.
const STRAVA_MISSING_SCOPES_PATH = "strava-missing-scopes";
const WEB_OUTCOME_PARAM = "strava";
const WEB_MISSING_SCOPES = "missing-scopes";

// Closes completed OAuth and refreshes account state after Strava linking.
export function useStravaDeepLink(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showMissingScopes = useMissingScopesNotice();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", (event) => {
      if (event.url.includes(STRAVA_MISSING_SCOPES_PATH)) {
        void Browser.close();
        showMissingScopes();
        return;
      }
      if (event.url.includes(STRAVA_DENIED_PATH)) {
        void Browser.close();
        return;
      }
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
  }, [queryClient, navigate, showMissingScopes]);

  useWebMissingScopes(showMissingScopes);
}

// Stable, so the deep-link listener is not re-registered on every render.
function useMissingScopesNotice(): () => void {
  const { t } = useTranslation();
  return useCallback((): void => {
    notifications.show({ color: "red.5", message: t("strava.missingScopes") });
  }, [t]);
}

// The web returns to "/?strava=missing-scopes"; the notice shows once and the parameter goes.
function useWebMissingScopes(show: () => void): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get(WEB_OUTCOME_PARAM) !== WEB_MISSING_SCOPES) return;
    show();
    params.delete(WEB_OUTCOME_PARAM);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.search, location.pathname, navigate, show]);
}
