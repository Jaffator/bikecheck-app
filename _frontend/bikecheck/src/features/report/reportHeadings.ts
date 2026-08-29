// The fixed words a Report prints around its own content — the section titles, the field
// labels, the "nothing recorded" lines.
//
// These follow the document's frozen language, not the reader's, because they are part of
// the document (ADR 0011). Everything the owner wrote, and every catalogue label, was
// already resolved into that language at Export time; these are what is left. The chrome
// *outside* the document — the gone message, the publish buttons — is the reader's, and
// goes through i18next as usual.

export interface ReportHeadings {
  serviceDocument: string;
  bike: string;
  date: string;
  odometer: string;
  total: string;
  work: string;
  replacement: string;
  components: string;
  note: string;
  attachments: string;
  noDate: string;
  noBike: string;
  noWork: string;
  issued: string;
  unreadable: string;
}

const en: ReportHeadings = {
  serviceDocument: "Service Report",
  bike: "Bike",
  date: "Service date",
  odometer: "Odometer",
  total: "Total",
  work: "Work done",
  replacement: "Replaced",
  components: "Components",
  note: "Note",
  attachments: "Attachments",
  noDate: "No date recorded",
  noBike: "Bike no longer on record",
  noWork: "No work recorded",
  issued: "Issued",
  unreadable: "This report needs a newer version of the app to be read.",
};

const cs: ReportHeadings = {
  serviceDocument: "Servisní report",
  bike: "Kolo",
  date: "Datum servisu",
  odometer: "Nájezd",
  total: "Celkem",
  work: "Provedené práce",
  replacement: "Výměna",
  components: "Komponenty",
  note: "Poznámka",
  attachments: "Přílohy",
  noDate: "Datum neuvedeno",
  noBike: "Kolo už není v evidenci",
  noWork: "Žádné práce nezaznamenány",
  issued: "Vystaveno",
  unreadable: "Pro zobrazení tohoto reportu je potřeba novější verze aplikace.",
};

const HEADINGS: Record<string, ReportHeadings> = { en, cs };

// A document written in a language this build does not print falls back to English rather
// than to raw keys — the content is still the owner's own words either way.
export function reportHeadings(language: string): ReportHeadings {
  return HEADINGS[language] ?? en;
}
