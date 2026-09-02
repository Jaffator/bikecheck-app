// Service empty state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

interface EmptyServiceProps {
  // Narrowed to a single bike: the copy speaks about that bike, not the whole garage.
  forBike?: boolean;
  // Narrowed to a period, which outranks the bike: an empty window says nothing about
  // whether the bike has ever been serviced, so the copy must point at the filter.
  forPeriod?: boolean;
}

// Show the empty Service tab.
export function EmptyService({ forBike = false, forPeriod = false }: EmptyServiceProps): ReactElement {
  const { t } = useTranslation();

  // Keys stay written out in full, so a search for one finds this file.
  const titleKey = forPeriod ? "service.emptyPeriodTitle" : forBike ? "service.emptyBikeTitle" : "service.emptyTitle";
  const bodyKey = forPeriod ? "service.emptyPeriodBody" : forBike ? "service.emptyBikeBody" : "service.emptyBody";

  // No action of its own: the FAB already offers adding a service on this tab.
  return <EmptyStateLayout illustration={bikeIllustration} title={t(titleKey)} body={t(bodyKey)} />;
}
