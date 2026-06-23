// Frozen shape of a report. Stored as JSON in the `reports` table so the report
// stays the same even after the bike or its components change or get deleted.

export const REPORT_SNAPSHOT_VERSION = 1;

export interface ReportSnapshot {
  version: number;
  generatedAt: string;
  bike: ReportBike;
  components: ReportComponent[];
  serviceHistory: ReportServiceEvent[];
}

export interface ReportBike {
  name: string | null;
  brand: string;
  model: string | null;
  year: number | null;
  frameMaterial: string | null;
  type: string | null;
  ebike: boolean;
  totalKm: number | null;
  totalTimeMin: number | null;
  imageUrl: string | null;
}

export interface ReportComponent {
  type: string;
  description: string | null;
  position: string | null;
  totalKm: number;
  totalTimeMin: number;
  healthIndex: number;
  mountedAt: string | null;
}

export interface ReportServiceEvent {
  date: string | null;
  note: string | null;
  actions: string[];
}
