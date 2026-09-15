// Garage empty state.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_garage_bike.png";

interface EmptyGarageProps {
  // How many bikes sit in the archive, and the way to open it. Both come from the garage
  // page, which owns the drawer.
  archivedCount: number;
  onOpenArchive: () => void;
}

// Show the empty Garage tab. An owner whose bikes are all archived is told so here - an
// empty garage must never read as lost data (ADR 0024).
export function EmptyGarage({ archivedCount, onOpenArchive }: EmptyGarageProps): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      illustration={bikeIllustration}
      title={t("bikes.emptyTitle")}
      body={archivedCount > 0 ? t("bikes.emptyArchivedBody", { count: archivedCount }) : t("bikes.emptyBody")}
    >
      {archivedCount > 0 && (
        <Button variant="default" radius="md" onClick={onOpenArchive}>
          {t("bikes.emptyOpenArchive")}
        </Button>
      )}
    </EmptyStateLayout>
  );
}
