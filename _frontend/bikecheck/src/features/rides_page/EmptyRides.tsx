// UI component using feature hooks.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import trailIllustration from "@/assets/images/rides.png";

// Displays the empty rides state.
export function EmptyRides(): ReactElement {
  const { t } = useTranslation();

  return <EmptyStateLayout illustration={trailIllustration} title={t("rides.emptyTitle")} body={t("rides.emptyBody")} />;
}
