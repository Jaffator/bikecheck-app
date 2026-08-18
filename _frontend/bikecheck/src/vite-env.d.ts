/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Host of the Strava microservice — where Strava sends the browser back after
  // the user authorizes. A LAN IP in dev: the Android WebView resolves
  // "localhost" to the phone itself, not to the machine running the service.
  readonly VITE_STRAVA_MICROSERVICE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
