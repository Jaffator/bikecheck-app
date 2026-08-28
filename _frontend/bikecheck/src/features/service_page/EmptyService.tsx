// Service empty state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

interface EmptyServiceProps {
  // Narrowed to a single bike: the copy speaks about that bike, not the whole garage.
  forBike?: boolean;
}

// Show the empty Service tab.
export function EmptyService({ forBike = false }: EmptyServiceProps): ReactElement {
  const { t } = useTranslation();

  // No action of its own: the FAB already offers adding a service on this tab.
  return (
    <EmptyStateLayout
      illustration={bikeIllustration}
      title={t(forBike ? "service.emptyBikeTitle" : "service.emptyTitle")}
      body={t(forBike ? "service.emptyBikeBody" : "service.emptyBody")}
    />
  );
}
