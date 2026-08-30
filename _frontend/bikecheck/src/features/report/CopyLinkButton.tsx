// UI component using feature hooks.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";

// Long enough for the owner to read that it worked, short enough not to sit there.
const COPIED_FOR_MS = 1500;

interface CopyLinkButtonProps {
  shareUrl: string;
  // The sheet hands its buttons the full width; a list row wears the compact size.
  size?: "sm" | "compact-sm";
}

// Takes a Share Link to the clipboard and says so. The Export sheet and the Reports list
// both offer it, so the two cannot say "copied" for different lengths of time.
export function CopyLinkButton({ shareUrl, size = "sm" }: CopyLinkButtonProps): ReactElement {
  const { t } = useTranslation();
  const clipboard = useClipboard({ timeout: COPIED_FOR_MS });

  return (
    <Button
      variant="outline"
      color="primary.5"
      radius="md"
      size={size}
      leftSection={clipboard.copied ? <Check size={16} /> : <Copy size={16} />}
      onClick={() => clipboard.copy(shareUrl)}
    >
      {clipboard.copied ? t("report.copied") : t("report.copy")}
    </Button>
  );
}
