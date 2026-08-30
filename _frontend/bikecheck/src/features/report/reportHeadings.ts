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
  periodDocument: string;
  bikeCheckDocument: string;
  period: string;
  allTime: string;
  // Prefixes, put in front of the day they open or close on.
  periodFrom: string;
  periodTo: string;
  services: string;
  replacements: string;
  spent: string;
  build: string;
  brand: string;
  model: string;
  year: string;
  frameMaterial: string;
  bikeType: string;
  ebike: string;
  yes: string;
  mounted: string;
  lastService: string;
  wear: string;
  neverServiced: string;
  noComponents: string;
  noServices: string;
  bike: string;
  date: string;
  odometer: string;
  total: string;
  work: string;
  replacement: string;
  components: string;
  note: string;
  attachments: string;
  rideTime: string;
  task: string;
  details: string;
  cost: string;
  signature: string;
  noDate: string;
  noBike: string;
  noWork: string;
  issued: string;
  unreadable: string;
}

const en: ReportHeadings = {
  serviceDocument: "Service Report",
  periodDocument: "Period Report",
  bikeCheckDocument: "BikeCheck",
  period: "Period",
  allTime: "All time",
  periodFrom: "From",
  periodTo: "Until",
  services: "Services",
  replacements: "Replacements",
  spent: "Total spent",
  build: "Build",
  brand: "Brand",
  model: "Model",
  year: "Year",
  frameMaterial: "Frame",
  bikeType: "Type",
  ebike: "E-bike",
  yes: "Yes",
  mounted: "Mounted",
  lastService: "Last service",
  wear: "Wear",
  neverServiced: "Never serviced",
  noComponents: "No components on record",
  noServices: "No services in this period",
  bike: "Bike",
  date: "Service date",
  odometer: "Odometer",
  total: "Total",
  work: "Work done",
  replacement: "Replaced",
  components: "Components",
  note: "Note",
  attachments: "Attachments",
  rideTime: "Ride time",
  task: "Task",
  details: "Details & notes",
  cost: "Cost",
  signature: "Signature",
  noDate: "No date recorded",
  noBike: "Bike no longer on record",
  noWork: "No work recorded",
  issued: "Issued",
  unreadable: "This report needs a newer version of the app to be read.",
};

const cs: ReportHeadings = {
  serviceDocument: "Servisní report",
  periodDocument: "Report za období",
  bikeCheckDocument: "BikeCheck",
  period: "Období",
  allTime: "Celá historie",
  periodFrom: "Od",
  periodTo: "Do",
  services: "Servisy",
  replacements: "Výměny",
  spent: "Celkem utraceno",
  build: "Osazení",
  brand: "Značka",
  model: "Model",
  year: "Rok",
  frameMaterial: "Rám",
  bikeType: "Typ",
  ebike: "Elektrokolo",
  yes: "Ano",
  mounted: "Namontováno",
  lastService: "Poslední servis",
  wear: "Nájezd",
  neverServiced: "Zatím neservisováno",
  noComponents: "Žádné komponenty v evidenci",
  noServices: "V tomto období žádné servisy",
  bike: "Kolo",
  date: "Datum servisu",
  odometer: "Nájezd",
  total: "Celkem",
  work: "Provedené práce",
  replacement: "Výměna",
  components: "Komponenty",
  note: "Poznámka",
  attachments: "Přílohy",
  rideTime: "Doba jízdy",
  task: "Úkon",
  details: "Podrobnosti a poznámky",
  cost: "Cena",
  signature: "Podpis",
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
