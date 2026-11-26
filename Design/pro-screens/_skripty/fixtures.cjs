// Sample rider for screenshots of the real app; every /api call is answered from here.
const NOW = "2026-11-26T10:00:00.000Z";

const user = {
  id: 1, name: "Jarda", email: "jarda@example.com", avatar_url: null, language: "cs", currency: "CZK",
  weight_kg: 78, tire_pressure_unit: "bar", is_active: true, has_password: true, notifications_enabled: true,
  strava_athlete_id: "123", strava_firstname: "Jarda", strava_lastname: null, strava_username: null,
  strava_avatar_url: null, strava_last_sync_at: "2026-11-26T08:00:00.000Z", welcome_seen_at: NOW,
  hints_seen: [], hints_enabled: false, last_login_at: NOW, created_at: "2026-01-01T00:00:00.000Z", updated_at: NOW,
};

const bike = {
  id: 11, user_id: 1, ebike: false, organization_id: null, bike_brand: "Orbea", bike_model: "Rallon",
  image_url: "/__shot/rallon.webp", bike_type_id: 1, bike_type: "Enduro", bikename: "Orbea Rallon", year: 2024,
  description: null, wheel_size: "29", bike_size: "L", total_km: 0, total_time_min: 0, bike_weight_kg: 15.4,
  total_elevation_m: 3201, has_front_suspension: true, has_rear_suspension: true, created_at: "2026-01-02T00:00:00.000Z",
  updated_at: NOW, frame_material: "carbon", is_deleted: false, deleted_at: null, strava_gear_id: "b1",
  strava_name: "Rallon", is_shared: false, active_setup_profile_id: null,
  ride_count: 182, ride_km: 4550, ride_time_min: 840, ride_elevation_m: 3201, last_ride_at: "2026-11-24T09:00:00.000Z",
  color_index: 0,
};

const bikeLimit = { bike_limit: 1, bike_count: 1, has_archived_bikes: false, pro_since: null };

const profile = {
  handle: "jarda", visibility: "FOLLOWERS", share_components: true, share_setup: false, share_history: true,
  share_costs: false, share_figures: true, stats: { views: 14, followers: 3, pending_requests: 1 },
  suggested_handle: null, public_origin: "https://app.bikecheck.cloud",
};

// Google's encoded polyline of a list of [lat, lng].
function encode(points) {
  let out = "", plat = 0, plng = 0;
  const num = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lat, lng] of points) {
    const a = Math.round(lat * 1e5), b = Math.round(lng * 1e5);
    out += num(a - plat) + num(b - plng);
    plat = a; plng = b;
  }
  return out;
}

// A wobbly loop around the Jizerské hory, different for each seed.
function loop(seed, size) {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const r = size * (1 + 0.25 * Math.sin(t * 3 + seed) + 0.12 * Math.cos(t * 7 + seed * 2));
    pts.push([50.80 + seed * 0.004 + r * Math.sin(t) * 0.6, 15.10 + seed * 0.006 + r * Math.cos(t)]);
  }
  return encode(pts);
}

const line = (key, name, measure, amount, before, after, id) => ({
  component_mounted_id: id, event_action_id: id, component_type: name, component_type_i18n_key: `component.${key[0]}`,
  position: null, action_name: name, action_i18n_key: `action.${key[1]}`, replace_action: false, measure, amount, before, after,
});

const RIDES = [
  ["2026-11-24T09:10:00Z", "Ještěd a zpět", 38.4, 142, 1120, true],
  ["2026-11-22T13:30:00Z", "Bedřichov enduro", 24.1, 118, 890, false],
  ["2026-11-19T15:00:00Z", "Večerní okruh", 18.7, 64, 310, false],
  ["2026-11-16T08:45:00Z", "Smědava", 52.3, 196, 1480, false],
  ["2026-11-12T16:20:00Z", "Lesní cesty", 21.9, 81, 420, false],
  ["2026-11-09T10:00:00Z", "Jizerka", 44.6, 171, 1210, false],
  ["2026-11-04T09:00:00Z", "Tanvaldský Špičák", 31.2, 126, 960, false],
].map(([at, name, km, min, up, checked], i) => ({
  id: 100 + i, activity_strava_id: String(9000 + i), bike_id: 11, bike_name: "Orbea Rallon", started_at: at,
  distance_m: Math.round(km * 1000), duration_min: min, elevation_up_m: up, elevation_down_m: up - 12,
  speed_avg: +(km / (min / 60)).toFixed(1), max_speed_kmh: 52 + i * 3, is_private: i === 4,
  summary_polyline: loop(i, 0.03 + km / 2500), created_at: at, name,
  wore_off: [
    line(["chain", "chainWearCheck"], "Řetěz", "drivetrain_km", km, 62 + i, 63 + i, 1),
    line(["fork", "forkBasicService"], "Vidlice", "suspension_min", min, 40 + i * 2, 42 + i * 2, 2),
    line(["brakePad", "padsReplacement"], "Brzdové destičky", "total_km", km, 71 + i, 72 + i, 3),
  ],
  check_in: checked ? { status: "ISSUE", symptoms: ["SOFT_BRAKE"], note: "Zadní brzda měkčí" } : i === 1 ? { status: "OK", symptoms: [], note: null } : null,
}));

const ridePage = {
  items: RIDES, total: RIDES.length,
  weeks: [
    { start: "2026-11-23", count: 1, km: 38.4, time_min: 142 },
    { start: "2026-11-16", count: 3, km: 95.1, time_min: 378 },
    { start: "2026-11-09", count: 2, km: 66.5, time_min: 252 },
    { start: "2026-11-02", count: 1, km: 31.2, time_min: 126 },
  ],
  figures: { count: 7, distance_m: 231200, time_min: 898, elevation_up_m: 6390, elevation_down_m: 6306, previous_distance_m: 198400 },
};

const person = (handle, name, relation, visibility = "PUBLIC") => ({ handle, name, avatar_url: null, visibility, relation });
const following = [person("petr-enduro", "Petr Novák", "FOLLOWING"), person("lucie", "Lucie Dvořáková", "FOLLOWING", "FOLLOWERS"), person("tomas-xc", "Tomáš Král", "FOLLOWING")];
const followers = [
  { user_id: 5, handle: "martin", name: "Martin Svoboda", avatar_url: null, status: "PENDING", created_at: "2026-11-25T18:00:00Z" },
  { user_id: 2, handle: "petr-enduro", name: "Petr Novák", avatar_url: null, status: "ACCEPTED", created_at: "2026-10-02T18:00:00Z" },
  { user_id: 3, handle: "lucie", name: "Lucie Dvořáková", avatar_url: null, status: "ACCEPTED", created_at: "2026-09-12T18:00:00Z" },
  { user_id: 4, handle: null, name: "Karel", avatar_url: null, status: "ACCEPTED", created_at: "2026-08-12T18:00:00Z" },
];

// Exact path (without /api) -> body. Unknown GETs are logged and answered by guess().
const exact = {
  "/auth/me": user,
  "/bike": [bike],
  "/bike?archived=true": [],
  "/profiles/me": profile,
  "/rides/check-in-prompt": { rides: [], pending: [] },
  "/notifications?unread=true": [],
  "/billing/bike-limit": bikeLimit,
  "/strava/pending-activities": [],
  "/follows/following": following,
  "/follows/followers": followers,
  "/reports/mine": [],
};

const act = (key, name, cost, replace, id, comp, compKey, note = null, tags = []) => ({
  action_done_id: id, action_id: id, action_name: name, action_i18n_key: `action.${key}`, partial_cost: cost,
  replace_action: replace, note, tags,
  mounted_components: [{
    id: 200 + id, component_type_id: id, component_desc: comp, position: null, component_type: compKey,
    component_type_i18n_key: `component.${compKey}`, km_at_time: 4380, time_min_at_time: 800,
    drivetrain_km_at_time: 4380, suspension_min_at_time: 800,
  }],
});

const SERVICES = [
  {
    id: 301, bike_id: 11, bike_name: "Orbea Rallon", bike_km_at_time: 4380, bike_minutes_at_time: 16020,
    note: "Před zimou celý pohon a vidlice.", total_cost: 3890, service_date: "2026-11-20", place: "SHOP",
    shop_name: "Kolo Liberec", created_at: "2026-11-20T15:00:00Z", updated_at: null,
    actions_done: [
      act("chainReplacement", "Výměna řetězu", 1290, true, 1, "Shimano XT M8100", "chain"),
      act("forkBasicService", "Základní servis vidlice", 1800, false, 2, "Fox 38 Factory", "fork", "Výměna těsnění a oleje v nohách."),
      act("padsReplacement", "Výměna destiček", 800, true, 3, "Shimano N04C", "brakePad"),
    ],
    attachments: [{ id: 1, name: "faktura-kolo-liberec.pdf", url: "/__shot/x.pdf", content_type: "application/pdf", size_bytes: 184000 }],
  },
  {
    id: 302, bike_id: 11, bike_name: "Orbea Rallon", bike_km_at_time: 4100, bike_minutes_at_time: 15000, note: null,
    total_cost: 0, service_date: "2026-11-02", place: "HOME", shop_name: null, created_at: "2026-11-02T15:00:00Z",
    actions_done: [act("chainLube", "Mazání řetězu", null, false, 4, "Shimano XT M8100", "chain")], attachments: [],
  },
  {
    id: 303, bike_id: 11, bike_name: "Orbea Rallon", bike_km_at_time: 3800, bike_minutes_at_time: 14000, note: null,
    total_cost: 450, service_date: "2026-10-14", place: "HOME", shop_name: null, created_at: "2026-10-14T15:00:00Z",
    actions_done: [act("tireReplacement", "Výměna pláště", 450, true, 5, "Maxxis Assegai", "tire"), act("sealantRefresh", "Doplnění tmelu", null, false, 6, "Stan's", "sealant")], attachments: [],
  },
];

const historyItem = (s) => ({
  id: s.id, bike_id: s.bike_id, bike_name: s.bike_name, service_date: s.service_date, action_count: s.actions_done.length,
  actions: s.actions_done.map((a) => ({ name: a.action_name, i18n_key: a.action_i18n_key })), total_cost: s.total_cost || null,
  place: s.place, shop_name: s.shop_name,
});

const historyPage = {
  items: SERVICES.map(historyItem), total: SERVICES.length,
  month_totals: [{ month: "2026-11", service_count: 2, total_cost: 3890 }, { month: "2026-10", service_count: 1, total_cost: 450 }],
};

const tracked = (id, comp, compKey, desc, actKey, actName, axis, measure, current, interval, level, extra = {}) => ({
  bike_id: 11, component_mounted_id: 200 + id, component_type_id: id, component_group_id: id, component_type: compKey,
  component_type_i18n_key: `component.${compKey}`, component_desc: desc, position: null, event_action_id: id,
  action_name: actName, action_i18n_key: `action.${actKey}`, axis, measure, current, interval,
  percentage: Math.round((current / interval) * 100), level, default_interval: interval, interval_override: null,
  notify: true, mounted_at: "2026-03-10T00:00:00Z", planned_for: null, replace_action: false,
  bike_brand: "Orbea", bike_model: "Rallon", year: 2024, ...extra,
});

const TRACKED = [
  tracked(1, "Řetěz", "chain", "Shimano XT M8100", "chainWearCheck", "Kontrola opotřebení řetězu", "km", "drivetrain_km", 520, 500, "overdue"),
  tracked(2, "Vidlice", "fork", "Fox 38 Factory", "forkBasicService", "Základní servis vidlice", "min", "suspension_min", 2760, 3000, "critical", { planned_for: "2026-11-29" }),
  tracked(3, "Brzdové destičky", "brakePad", "Shimano N04C", "padsReplacement", "Výměna destiček", "km", "total_km", 1640, 2000, "warning"),
  tracked(4, "Tlumič", "shock", "Fox Float X2", "shockBasicService", "Základní servis tlumiče", "min", "suspension_min", 1500, 3000, "good"),
  tracked(5, "Plášť", "tire", "Maxxis Assegai", "sealantRefresh", "Doplnění tmelu", "min", "total_time_min", 600, 5400, "very_good"),
];

function guess(path) {
  if (path.startsWith("/service-tracking/attention")) {
    const min = Number(new URLSearchParams(path.split("?")[1] ?? "").get("minPercentage") ?? 0);
    return TRACKED.filter((t) => t.percentage >= min);
  }
  if (path.startsWith("/service-tracking/tracked-actions")) return TRACKED;
  if (path.startsWith("/rides?")) return ridePage;
  if (path.startsWith("/bike-events/history/totals")) return { total_cost: 4340, service_count: 3, replacement_count: 4 };
  if (path.startsWith("/bike-events/history")) return historyPage;
  const detail = path.match(/^\/bike-events\/(\d+)$/);
  if (detail) return SERVICES.find((s) => s.id === Number(detail[1])) ?? SERVICES[0];
  if (/count/.test(path)) return { count: 0 };
  return [];
}

module.exports = { exact, guess, user, bike, bikeLimit, RIDES };
