// The BikeCheck: the machine's card rather than its maintenance — the bike, and everything
// mounted on it, so a buyer can check the build against what is in front of them.
import type { ReactElement } from "react";
import { Cog } from "lucide-react";
import type { BikeCheckSnapshot } from "./report.types";
import { REPORT_PAPER, reportBikeName, reportNumber, reportRideTime } from "./reportFormat";
import { reportHeadings } from "./reportHeadings";
import { ComponentRow } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, Field, ScreenSheet, Section } from "./ReportPaper";

interface BikeCheckDocumentProps {
  snapshot: BikeCheckSnapshot;
}

export function BikeCheckDocument({ snapshot }: BikeCheckDocumentProps): ReactElement {
  const { bike, components, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);

  return (
    <ScreenSheet>
      <DocumentHeader title={heading.bikeCheckDocument} />

      {bike.imageUrl !== null && (
        <img
          src={bike.imageUrl}
          alt={bikeName ?? heading.bike}
          className="w-full rounded-sm object-cover"
          style={{ aspectRatio: 2 }}
        />
      )}

      <h2 className="text-xl font-semibold leading-tight" style={{ color: bikeName === null ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}>
        {bikeName ?? heading.noBike}
      </h2>

      {/* What the machine is, field by field, so the card reads as a description of it. */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label={heading.brand} value={bike.brand === "" ? "—" : bike.brand} />
        <Field label={heading.model} value={bike.model ?? "—"} />
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
      </section>

      <Section icon={<Cog size={16} />} title={heading.build}>
        {components.length === 0 ? (
          <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
            {heading.noComponents}
          </p>
        ) : (
          <div className="flex flex-col">
            {components.map((component, index) => (
              <ComponentRow key={index} component={component} heading={heading} language={language} />
            ))}
          </div>
        )}
      </Section>

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} />
    </ScreenSheet>
  );
}
