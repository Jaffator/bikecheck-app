// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import trailIllustration from "@/assets/images/rides.png";

// What a user with no recorded rides yet sees on the Rides tab.
export function EmptyRides(): ReactElement {
  const { t } = useTranslation();

  return <EmptyStateLayout illustration={trailIllustration} title={t("rides.emptyTitle")} body={t("rides.emptyBody")} />;
}
