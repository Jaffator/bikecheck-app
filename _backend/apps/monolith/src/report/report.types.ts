import { Readable } from 'stream';

// The frozen shape of a Report. Stored as JSON in the `reports` table so the document
// reads as it did the day it was made, however far the live data moves afterwards
// (ADR 0011).

export const REPORT_SNAPSHOT_VERSION = 2;

// What a reader gets. A discriminated union on `kind`, so one column serves all three
// documents and the public page narrows on the discriminant.
export type ReportSnapshot = ServiceReportSnapshot | PeriodReportSnapshot | BikeCheckSnapshot;

interface SnapshotCommon {
  version: typeof REPORT_SNAPSHOT_VERSION;
  generatedAt: string;
  // The owner's language at the moment of Export, frozen with everything else. Every
  // catalogue label below is already resolved into it - the reader's language never
  // touches the document's content.
  language: string;
  // The currency every figure below is written in, frozen alongside the language: a
  // document that does not say what its numbers cost in is not evidence of a price.
  currency: string;
}

export interface ServiceReportSnapshot extends SnapshotCommon {
  kind: 'SERVICE';
  bike: ReportBike;
  service: ReportService;
}

export interface PeriodReportSnapshot extends SnapshotCommon {
  kind: 'PERIOD';
  bike: ReportBike;
  period: ReportPeriod;
  services: ReportService[];
  totals: ReportHistoryTotals;
  // Null when the owner did not ask for them, which is not the same as an empty list.
  components: ReportComponent[] | null;
}

export interface BikeCheckSnapshot extends SnapshotCommon {
  kind: 'BIKECHECK';
  bike: ReportBike;
  components: ReportComponent[];
}

// What the `snapshot` column actually holds: the document a reader may see, and beside
// it what only the server may. The split is structural rather than a list of fields to
// remember to delete, so the public read cannot leak by omission (ADR 0013).
export interface StoredReportSnapshot {
  document: ReportSnapshot;
  private: ReportSnapshotPrivate;
}

export interface ReportSnapshotPrivate {
  // The storage key each attachment's bytes live under, by attachment id. Never emitted:
  // the Report hands a stranger an id, and the attachment route resolves it here. A key
  // rather than the public address, so nothing the snapshot keeps is fetchable on its own
  // (ADR 0013).
  attachmentKeys: Record<string, string>;
}

// Where one attachment's bytes are, with the name and type the document froze for them.
// Internal to the report domain: the key never leaves it.
export interface ReportAttachmentSource {
  key: string;
  name: string;
  contentType: string;
}

// The same attachment with its bytes in hand, ready to be handed to a reader.
export interface ReportAttachmentFile {
  body: Readable;
  name: string;
  contentType: string;
  // Whatever storage reported, which it does not always do.
  contentLength: number | null;
}

export interface ReportBike {
  name: string | null;
  brand: string;
  model: string | null;
  year: number | null;
  frameMaterial: string | null;
  // Already in the report's language.
  type: string | null;
  ebike: boolean;
  totalKm: number | null;
  totalTimeMin: number | null;
  imageUrl: string | null;
}

export interface ReportPeriod {
  // Inclusive YYYY-MM-DD, or null for an open end. Both open is all time.
  from: string | null;
  to: string | null;
}

export interface ReportHistoryTotals {
  totalCost: number;
  serviceCount: number;
  replacementCount: number;
}

export interface ReportService {
  // When the work happened, which may predate when it was recorded.
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
  // Already in the report's language.
  name: string;
  // What was done on this occasion, in the owner's own words.
  note: string | null;
  cost: number | null;
  // A Replacement swapped the part out; a buyer reads that differently from a service.
  replacement: boolean;
  components: ReportComponent[];
}

export interface ReportComponent {
  // Already in the report's language.
  type: string;
  // The Component Category the type belongs to, in the report's language.
  category: string | null;
  description: string | null;
  position: string | null;
  totalKm: number | null;
  totalTimeMin: number | null;
  healthIndex: number | null;
  mountedAt: string | null;
}

// An id, a name, a type and a weight - never a storage address (ADR 0013).
export interface ReportAttachment {
  id: number;
  name: string;
  contentType: string;
  sizeBytes: number | null;
}
