// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

// What a user with no serviceable components yet sees on the Service tab.
export function EmptyService(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout illustration={bikeIllustration} title={t("service.emptyTitle")} body={t("service.emptyBody")} />
  );
}
