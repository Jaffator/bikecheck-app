// PROTOTYPE ONLY - static mock data, no fetching. Shapes follow the tool contract
// decided in issue #56 (normalised units, denormalised names, status, total_count).

export interface ToolStep {
  name: string;
  label: string;
  rows: number;
  done: boolean;
}

export interface PartRow {
  component_type: string;
  component_desc: string;
  status: "mounted" | "removed";
  mounted_at: string;
  removed_at?: string;
  distance_km: number;
  service_count: number;
}

export const SUGGESTIONS: string[] = [
  "Kdy jsem naposled měnil řetěz?",
  "Kolik mě stál servis letos?",
  "Co má nejvíc najeto?",
  "Kdy jsem servisoval vidlici?",
];

export const QUESTION = "Kdy jsem naposled měnil řetěz na Hightoweru?";

export const STEPS: ToolStep[] = [
  { name: "get_garage", label: "Prohlížím garáž", rows: 2, done: true },
  { name: "list_parts", label: "Dohledávám řetězy", rows: 3, done: true },
  { name: "list_services", label: "Čtu servisy", rows: 7, done: false },
];

export const ANSWER =
  "Řetěz na Santa Cruz Hightower jsi měnil 14. 5. 2026 — ten předchozí vydržel 1 240 km od února. Aktuální má najeto 310 km, takže do výměny máš ještě zásobu.";

export const PARTS: PartRow[] = [
  {
    component_type: "Řetěz",
    component_desc: "Shimano XT M8100",
    status: "mounted",
    mounted_at: "2026-05-14",
    distance_km: 310,
    service_count: 1,
  },
  {
    component_type: "Řetěz",
    component_desc: "Shimano SLX M7100",
    status: "removed",
    mounted_at: "2026-02-01",
    removed_at: "2026-05-14",
    distance_km: 1240,
    service_count: 2,
  },
  {
    component_type: "Řetěz",
    component_desc: "bez popisu",
    status: "removed",
    mounted_at: "2025-09-08",
    removed_at: "2026-02-01",
    distance_km: 980,
    service_count: 0,
  },
];

export const THREADS: { title: string; when: string }[] = [
  { title: "Kdy jsem naposled měnil řetěz?", when: "dnes" },
  { title: "Kolik mě stál servis letos?", when: "včera" },
  { title: "Co má nejvíc najeto?", when: "3. 9." },
];
