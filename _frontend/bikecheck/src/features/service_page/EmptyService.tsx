// Service empty state.
import type { ReactElement } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

interface EmptyServiceProps {
  // Narrowed to a single bike: the copy speaks about that bike, not the whole garage.
  forBike?: boolean;
  // Bikes exist but none has a service yet, so the copy must not ask for a bike.
  forGarage?: boolean;
  // Narrowed to a period, which outranks the bike: an empty window says nothing about
  // whether the bike has ever been serviced, so the copy must point at the filter.
  forPeriod?: boolean;
  // Set when the attention card already sits above the state, so it keeps a plain gap under
  // that card instead of the offset the empty pages share.
  compact?: boolean;
  // What stands above the copy, with the illustration running behind it.
  header?: ReactNode;
}

// The gap under the attention card. Wide enough to read as a separate block, narrow enough to
// keep the copy on screen when the card is expanded.
const COMPACT_TOP_SPACE = "20dvh";

// Show the empty Service tab.
export function EmptyService({
  forBike = false,
  forGarage = false,
  forPeriod = false,
  compact = false,
  header,
}: EmptyServiceProps): ReactElement {
  const { t } = useTranslation();

  // Keys stay written out in full, so a search for one finds this file.
  const titleKey = forPeriod
    ? "service.emptyPeriodTitle"
    : forBike
      ? "service.emptyBikeTitle"
      : forGarage
        ? "service.emptyGarageTitle"
        : "service.emptyTitle";
  const bodyKey = forPeriod
    ? "service.emptyPeriodBody"
    : forBike
      ? "service.emptyBikeBody"
      : forGarage
        ? "service.emptyGarageBody"
        : "service.emptyBody";

  // No action of its own: the FAB already offers adding a service on this tab.
  // The illustration belongs to the first run only: once a bike is in the garage, the page
  // has a card above the copy and the picture behind it is noise.
  const firstRun = !forBike && !forGarage && !forPeriod;

  return (
    <EmptyStateLayout
      illustration={firstRun ? bikeIllustration : undefined}
      title={t(titleKey)}
      body={t(bodyKey)}
      topSpace={compact ? COMPACT_TOP_SPACE : undefined}
      header={header}
    />
  );
}
