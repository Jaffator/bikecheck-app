// The Bike Report export, under the bike's card. An Archived Bike keeps it: the machine being
// sold is what a report is most often asked for.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

export function BikeExportButton({ onExport }: { onExport: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      radius="lg"
      h={48}
      fullWidth
      leftSection={<Download size={17} color="var(--mantine-color-primary-5)" />}
      onClick={onExport}
    >
      {t("report.exportBikeReport")}
    </Button>
  );
}
