// How a Period Report's timeline divides. Shared by the screen and print variants, so the
// two never group the same services differently.
import type { ReportService } from "./report.types";
import { reportServiceYear } from "./reportFormat";

// The Services of one year, in the order the document already holds them.
export interface ServiceYearGroup {
  // Null for the Services carrying no Service Date - they belong to no year.
  year: string | null;
  services: ReportService[];
}

// The timeline's divisions. Years newest first, and the undated Services last under their
// own heading rather than dropped from the document that covers them.
export function groupByYear(services: ReportService[]): ServiceYearGroup[] {
  const groups: ServiceYearGroup[] = [];

  for (const service of services) {
    const year = reportServiceYear(service.serviceDate);
    const current = groups.find((group) => group.year === year);
    if (current === undefined) {
      groups.push({ year, services: [service] });
    } else {
      current.services.push(service);
    }
  }

  return groups.sort(byYearDescending);
}

function byYearDescending(left: ServiceYearGroup, right: ServiceYearGroup): number {
  if (left.year === null) return 1;
  if (right.year === null) return -1;
  return right.year.localeCompare(left.year);
}
