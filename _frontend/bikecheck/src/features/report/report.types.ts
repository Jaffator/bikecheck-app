// Mirrors the backend report DTOs and the frozen snapshot it stores.

export type ReportKind = "SERVICE" | "PERIOD" | "BIKECHECK";

// One Report as its owner manages it. A report has three states, and it takes both flags
// to tell them apart: made but closed, published and open, revoked and closed for good.
export interface ReportSummary {
  id: number;
  public_token: string;
  // The public address the report is read at. Always the web origin.
  share_url: string;
  kind: ReportKind;
  bike_id: number;
  covers: ReportCovers;
  is_public: boolean;
  view_count: number;
  last_viewed_at: string | null;
  revoked: boolean;
  expires_at: string | null;
  created_at: string;
}

// What a Report is about, frozen with the document rather than read off live data — so a
// Report for a bike its owner has since deleted still says which bike it was.
export interface ReportCovers {
  // The bike as the document named it.
  bike: string;
  // The day the document opens on: a Service's date, a Period's start. Null is an open end,
  // and a BikeCheck covers no span at all.
  from: string | null;
  to: string | null;
}

// What Export answers with: the report, and the document it just made. The snapshot rides
// along so the preview needs no second round trip and counts no view.
export interface ExportedReport extends ReportSummary {
  snapshot: ReportSnapshot;
}

export interface ExportServiceReportInput {
  kind: "SERVICE";
  service_id: number;
}

// The Period Report is asked for with the same Bike and Period the history list is already
// running on, so the Report and the screen can never disagree.
export interface ExportPeriodReportInput {
  kind: "PERIOD";
  bike_id: number;
  from?: string;
  to?: string;
  // Answered on the Export sheet's Options step rather than by whatever opened it, because
  // the choice is frozen into the Report: one exported without components never grows them.
  include_components?: boolean;
}

export interface ExportBikeCheckInput {
  kind: "BIKECHECK";
  bike_id: number;
}

export type ExportReportInput = ExportServiceReportInput | ExportPeriodReportInput | ExportBikeCheckInput;

// ------------------------------------------------------------------
// The frozen document
// ------------------------------------------------------------------

// A discriminated union on `kind`: the page narrows on the discriminant and lays the
// document out accordingly.
export type ReportSnapshot = ServiceReportSnapshot | PeriodReportSnapshot | BikeCheckSnapshot;

interface SnapshotCommon {
  version: number;
  generatedAt: string;
  // The language the document was written in — the owner's, not the reader's. Every
  // catalogue label below is already resolved into it, so nothing here is translated
  // again.
  language: string;
  // The currency every figure below is written in.
  currency: string;
}

export interface ServiceReportSnapshot extends SnapshotCommon {
  kind: "SERVICE";
  bike: ReportBike;
  service: ReportService;
}

export interface PeriodReportSnapshot extends SnapshotCommon {
  kind: "PERIOD";
  bike: ReportBike;
  period: ReportPeriod;
  services: ReportService[];
  totals: ReportHistoryTotals;
  // Null when the owner did not ask for them, which is not an empty list.
  components: ReportComponent[] | null;
}

export interface BikeCheckSnapshot extends SnapshotCommon {
  kind: "BIKECHECK";
  bike: ReportBike;
  components: ReportComponent[];
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

export interface ReportPeriod {
  from: string | null;
  to: string | null;
}

export interface ReportHistoryTotals {
  totalCost: number;
  serviceCount: number;
  replacementCount: number;
}

export interface ReportService {
  serviceDate: string | null;
  note: string | null;
  totalCost: number;
  // The bike's odometer as it stood on the service date.
  odometerKm: number | null;
  odometerTimeMin: number | null;
  actions: ReportAction[];
  attachments: ReportAttachment[];
}

export interface ReportAction {
  name: string;
  note: string | null;
  cost: number | null;
  // A Replacement swapped the part out, which a buyer reads differently from a service.
  replacement: boolean;
  components: ReportComponent[];
}

export interface ReportComponent {
  type: string;
  category: string | null;
  description: string | null;
  position: string | null;
  totalKm: number | null;
  totalTimeMin: number | null;
  healthIndex: number | null;
  mountedAt: string | null;
  // When the part was last worked on. Only a document listing the bike's own components
  // knows it; a component named inside one Service has no history beyond that occasion.
  lastServiceAt: string | null;
}

// An id, a name, a type and a weight — never a storage address. The bytes are served
// through the report itself.
export interface ReportAttachment {
  id: number;
  name: string;
  contentType: string;
  sizeBytes: number | null;
}
