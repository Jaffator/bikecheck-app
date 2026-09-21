// UI component using feature hooks.
import { useEffect, useState, type ReactElement } from "react";
import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { copyLink } from "@/utils/shareLink";

// Long enough for the owner to read that it worked, short enough not to sit there.
const COPIED_FOR_MS = 1500;

interface CopyLinkButtonProps {
  shareUrl: string;
  // The sheet hands its buttons the full width; a list row wears a smaller one.
  size?: "xs" | "sm" | "compact-sm";
  // Weight and colour belong to the screen the button stands on, not to the button: the
  // sheet runs it in the accent, the Reports list keeps it quiet beside Open.
  variant?: string;
  // Left out, the theme draws the quiet outline (neutral frame, accent only in the icon).
  color?: string;
}

// Takes a Share Link to the clipboard and says so. The Export sheet and the Reports list
// both offer it, so the two cannot say "copied" for different lengths of time.
export function CopyLinkButton({
  shareUrl,
  size = "sm",
  variant = "outline",
  color,
}: CopyLinkButtonProps): ReactElement {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // "Copied" is a moment, not a state the button stays in — and it is taken back if the
  // owner leaves the screen before it passes.
  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  // Nothing is claimed until the clipboard has actually taken it.
  async function copy(): Promise<void> {
    try {
      await copyLink(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant={variant}
      color={color}
      radius="md"
      size={size}
      leftSection={
        copied ? (
          <Check size={16} color="var(--mantine-color-primary-5)" />
        ) : (
          <Copy size={16} color="var(--mantine-color-primary-5)" />
        )
      }
      onClick={() => void copy()}
    >
      {copied ? t("report.copied") : t("report.copy")}
    </Button>
  );
}
