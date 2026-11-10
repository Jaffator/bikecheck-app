// The bike as a document describes it: its photo and its details, on a screen and on paper.
import type { ReactElement } from "react";
import type { ReportBike } from "@/features/report/report.types";
import { REPORT_PAPER, reportBikeName, reportNumber, reportRideTime } from "@/features/report/reportFormat";
import type { ReportHeadings } from "@/features/report/reportHeadings";
import { Field } from "./ReportPaper";

interface BikeProfileProps {
  bike: ReportBike;
  heading: ReportHeadings;
  language: string;
}

export function BikeProfile({ bike, heading, language }: BikeProfileProps): ReactElement {
  const bikeName = reportBikeName(bike);
  const hasImage = bike.imageUrl !== null;

  return (
    // A phone stacks them; a desktop page has the width to stand the photo beside the facts.
    <div
      className={`flex flex-col gap-7 ${hasImage ? "desktop:grid desktop:grid-cols-[3fr_2fr] desktop:items-center desktop:gap-10" : ""}`}
    >
      {bike.imageUrl !== null && (
        <img
          src={bike.imageUrl}
          alt={bikeName ?? heading.bike}
          className="w-full rounded-sm object-cover aspect-[2/1] desktop:object-contain desktop:aspect-[3/2]"
        />
      )}

      <div className="flex flex-col gap-7 min-w-0 desktop:gap-5">
        <h2
          className="text-xl font-semibold leading-tight"
          style={{ color: bikeName === null ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}
        >
          {bikeName ?? heading.noBike}
        </h2>

        {/* What the machine is, field by field, so the card reads as a description of it. */}
        <section className={`grid grid-cols-2 gap-x-6 gap-y-4 ${hasImage ? "" : "desktop:grid-cols-4"}`}>
          <Field label={heading.brand} value={bike.brand === "" ? "—" : bike.brand} />
          <Field label={heading.model} value={bike.model ?? "—"} />
          <BikeFacts bike={bike} heading={heading} language={language} />
        </section>
      </div>
    </div>
  );
}

export function BikeProfilePrint({ bike, heading, language }: BikeProfileProps): ReactElement {
  const bikeName = reportBikeName(bike);

  return (
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
          <BikeFacts bike={bike} heading={heading} language={language} />
        </div>
      </div>
    </section>
  );
}

function BikeFacts({ bike, heading, language }: BikeProfileProps): ReactElement {
  return (
    <>
      <Field label={heading.year} value={bike.year === null ? "—" : String(bike.year)} figure />
      <Field label={heading.frameMaterial} value={bike.frameMaterial ?? "—"} />
      <Field label={heading.bikeType} value={bike.type ?? "—"} />
      <Field label={heading.ebike} value={bike.ebike ? heading.yes : "—"} />
      <Field
        label={heading.odometer}
        value={bike.totalKm === null ? "—" : `${reportNumber(bike.totalKm, language)} km`}
        figure
      />
      <Field
        label={heading.rideTime}
        value={bike.totalTimeMin === null ? "—" : reportRideTime(bike.totalTimeMin, language)}
        figure
      />
    </>
  );
}
