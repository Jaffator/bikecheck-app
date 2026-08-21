/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Strava callback host; development Android WebViews require a LAN address.
  readonly VITE_STRAVA_MICROSERVICE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
