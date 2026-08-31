// Reports empty state.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";

// Sizes the icon standing in for the illustration this page does not have.
const ICON_SIZE = 96;

interface EmptyReportsProps {
  // Narrowed to a single bike: the copy speaks about that bike, not everything shared.
  forBike?: boolean;
}

// Show the empty Reports list.
export function EmptyReports({ forBike = false }: EmptyReportsProps): ReactElement {
  const { t } = useTranslation();

  // No action of its own: a link is only ever made by exporting from a service or a bike.
  return (
    <EmptyStateLayout
      icon={<Share2 size={ICON_SIZE} strokeWidth={1.25} />}
      title={t(forBike ? "report.emptyBikeTitle" : "report.emptyTitle")}
      body={t(forBike ? "report.emptyBikeBody" : "report.emptyBody")}
    />
  );
}
