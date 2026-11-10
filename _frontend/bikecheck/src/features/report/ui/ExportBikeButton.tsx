// The small Export button, where a Bike Report needs one bike chosen first.
import type { ReactElement } from "react";
import { Box, Button, Tooltip } from "@mantine/core";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

// Null when no one bike is chosen; the button then stays, disabled, with a tooltip saying why.
export function ExportBikeButton({ onExport }: { onExport: (() => void) | null }): ReactElement {
  const { t } = useTranslation();

  return (
    <Tooltip
      label={t("service.exportPickBike")}
      disabled={onExport !== null}
      events={{ hover: true, focus: false, touch: true }}
    >
      {/* A disabled button fires no hover, so the tooltip hangs on its wrapper. */}
      <Box component="span" ml="auto" style={{ flexShrink: 0 }}>
        <Button
          variant="outline"
          radius="md"
          size="xs"
          leftSection={<Download size={16} color="var(--mantine-color-primary-5)" />}
          disabled={onExport === null}
          // A tap on a disabled button reaches nothing, so it has to land on the wrapper.
          style={{ pointerEvents: onExport === null ? "none" : undefined }}
          onClick={onExport ?? undefined}
        >
          {t("report.export")}
        </Button>
      </Box>
    </Tooltip>
  );
}
