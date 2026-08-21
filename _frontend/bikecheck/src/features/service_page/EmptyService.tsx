// Service empty state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

// Show the empty Service tab.
export function EmptyService(): ReactElement {
  const { t } = useTranslation();

  return <EmptyStateLayout illustration={bikeIllustration} title={t("service.emptyTitle")} body={t("service.emptyBody")} />;
}
