// PROTOTYPE for #337, never merged: sample copy and readings instead of the API.
import type { ReportSummary } from "@/features/report/report.types";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

export const SAMPLE_RIDES = [
  {
    name: "Ranní Prokop",
    date: "2. 11. 2026 8:10",
    distance: "24 km",
    time: "1:12 h",
    climb: "430 m",
    polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  },
  {
    name: "Odpolední okruh",
    date: "30. 10. 2026 16:40",
    distance: "34 km",
    time: "1:52 h",
    climb: "610 m",
    polyline: "_ibE_seK_seK_seK_seK?",
  },
];

export const PERIOD_REPORT: ReportSummary = {
  id: 1,
  public_token: "sample",
  share_url: "https://app.bikecheck.cloud/r/sample",
  kind: "PERIOD",
  bike_id: 1,
  covers: { bike: "Orbea Rallon M-Team", from: "2026-01-01", to: "2026-11-01" },
  is_public: true,
  view_count: 3,
  last_viewed_at: "2026-11-02T10:00:00Z",
  revoked: false,
  expires_at: null,
  created_at: "2026-11-01T10:00:00Z",
};

export const SERVICE_REPORT: ReportSummary = {
  ...PERIOD_REPORT,
  id: 2,
  kind: "SERVICE",
  covers: { bike: "Orbea Rallon M-Team", from: "2026-09-14", to: null },
  is_public: false,
  view_count: 0,
  last_viewed_at: null,
};

export interface WelcomeSlide {
  title: string;
  body: string | null;
}

export const WELCOME_SLIDES: WelcomeSlide[] = [
  { title: "Tvůj nejlepší nástroj na správu kol", body: null },
  { title: "Víš, kdy je čas na servis", body: "BikeCheck hlídá intervaly a včas tě upozorní." },
  {
    title: "Sdílej svůj profil, nebo vytvoř servisní report",
    body: "Ukaž garáž ostatním jezdcům, nebo pošli PDF při prodeji kola.",
  },
  { title: "Tvoje garáž a setup na jednom místě", body: "Tlaky, kliky, sag a servisní historie." },
  { title: "Vytvoř první kolo", body: null },
];

const BASE_ACTION: TrackedAction = {
  bike_id: 1,
  component_mounted_id: 1,
  component_type_id: 1,
  component_group_id: 1,
  component_type: "Řetěz",
  component_type_i18n_key: null,
  component_desc: null,
  position: null,
  event_action_id: 1,
  action_name: "Výměna řetězu",
  action_i18n_key: null,
  axis: "km",
  measure: "total_km",
  current: 1880,
  interval: 2000,
  percentage: 94,
  level: "critical",
  default_interval: 2000,
  interval_override: null,
  notify: true,
  mounted_at: null,
  planned_for: null,
  replace_action: true,
};

export const CHAIN_ACTION: TrackedAction = BASE_ACTION;

export const PADS_ACTION: TrackedAction = {
  ...BASE_ACTION,
  component_mounted_id: 2,
  component_type: "Brzdové destičky",
  action_name: "Výměna destiček",
  current: 710,
  interval: 1000,
  percentage: 71,
  level: "good",
};

export const FORK_ACTION: TrackedAction = {
  ...BASE_ACTION,
  component_mounted_id: 3,
  component_type: "Vidlice",
  action_name: "Servis vidlice",
  current: 380,
  interval: 1000,
  percentage: 38,
  level: "very_good",
  replace_action: false,
};
