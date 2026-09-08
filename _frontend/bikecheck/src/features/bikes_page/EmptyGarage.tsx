// Garage empty state.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useArchivedBikes } from "@/features/bikes/bikes.queries";
import bikeIllustration from "@/assets/images/empty_garage_bike.png";

// Show the empty Garage tab. An owner whose bikes are all archived is told so here - an
// empty garage must never read as lost data (ADR 0024).
export function EmptyGarage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: archived } = useArchivedBikes();
  const archivedCount = archived?.length ?? 0;

  return (
    <EmptyStateLayout
      illustration={bikeIllustration}
      title={t("bikes.emptyTitle")}
      body={archivedCount > 0 ? t("bikes.emptyArchivedBody", { count: archivedCount }) : t("bikes.emptyBody")}
      badge={<StatusBadge label={t("bikes.noBikesFound")} />}
    >
      {archivedCount > 0 && (
        <Button variant="default" radius="md" onClick={() => navigate("/settings")}>
          {t("bikes.emptyOpenArchive")}
        </Button>
      )}
    </EmptyStateLayout>
  );
}
