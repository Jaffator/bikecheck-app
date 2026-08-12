// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { StatusBadge } from "@/components/StatusBadge";
import bikeIllustration from "@/assets/images/empty_garage_bike.png";

// What a user with no bikes yet sees on the Garage tab.
export function EmptyGarage(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      illustration={bikeIllustration}
      title={t("bikes.emptyTitle")}
      body={t("bikes.emptyBody")}
      badge={<StatusBadge label={t("bikes.noBikesFound")} />}
    />
  );
}
