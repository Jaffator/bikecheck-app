// The BikeCheck on paper: the same frozen document as the screen variant, laid out as one
// A4 sheet. Chosen by the `?print=1` query parameter rather than by `@media print`, so the
// render chromium captures is explicit rather than a side effect of a stylesheet.
import type { ReactElement } from "react";
import type { BikeCheckSnapshot } from "./report.types";
import { REPORT_PAPER, reportBikeName, reportNumber, reportRideTime } from "./reportFormat";
import { reportHeadings } from "./reportHeadings";
import { ComponentRow } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, Field, PrintSheet, Section } from "./ReportPaper";

interface BikeCheckPrintProps {
  snapshot: BikeCheckSnapshot;
}

export function BikeCheckPrint({ snapshot }: BikeCheckPrintProps): ReactElement {
  const { bike, components, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);

  return (
    <PrintSheet>
      <DocumentHeader title={heading.bikeCheckDocument} print />

      <section className="flex gap-6 items-start">
        {bike.imageUrl !== null && (
          <img src={bike.imageUrl} alt={bikeName ?? heading.bike} className="w-[70mm] rounded-sm object-cover" />
        )}
        <div className="flex flex-col gap-3 min-w-0">
          <h1
            className="text-xl font-semibold leading-tight"
            style={{ color: bikeName === null ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}
          >
            {bikeName ?? heading.noBike}
          </h1>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field label={heading.year} value={bike.year === null ? "—" : String(bike.year)} mono />
            <Field label={heading.frameMaterial} value={bike.frameMaterial ?? "—"} />
            <Field label={heading.bikeType} value={bike.type ?? "—"} />
            <Field label={heading.ebike} value={bike.ebike ? heading.yes : "—"} />
            <Field
              label={heading.odometer}
              value={bike.totalKm === null ? "—" : `${reportNumber(bike.totalKm, language)} km`}
              mono
            />
            <Field
              label={heading.rideTime}
              value={bike.totalTimeMin === null ? "—" : reportRideTime(bike.totalTimeMin, language)}
              mono
            />
          </div>
        </div>
      </section>

      <Section title={heading.build}>
        {components.length === 0 ? (
          <p className="text-[12px]" style={{ color: REPORT_PAPER.inkMuted }}>
            {heading.noComponents}
          </p>
        ) : (
          <div className="flex flex-col">
            {components.map((component, index) => (
              <ComponentRow key={index} component={component} heading={heading} language={language} compact />
            ))}
          </div>
        )}
      </Section>

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} print />
    </PrintSheet>
  );
}
