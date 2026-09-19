// PROTOTYPE #121 — throwaway. Copy / share / open for the profile link; only a PUBLIC
// profile has a page these can point at, so elsewhere they sit disabled (theme's look).
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group } from "@mantine/core";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { canShareLink, copyLink, shareLink } from "@/utils/shareLink";
import { profileUrl } from "./handle";

const COPIED_FOR_MS = 1500;

interface LinkActionsProps {
  handle: string;
  enabled: boolean;
  withShare?: boolean;
  withOpen?: boolean;
  size?: "xs" | "sm";
}

export function LinkActions({
  handle,
  enabled,
  withShare = false,
  withOpen = false,
  size = "sm",
}: LinkActionsProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const url = profileUrl(handle);

  // #132: the real page is a new tab; the prototype stays in this one so the store's
  // visibility and switches reach /u/<handle>.
  function open(): void {
    if (import.meta.env.DEV) navigate(`/u/${handle}`);
    else window.open(url, "_blank", "noopener");
  }

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy(): Promise<void> {
    try {
      await copyLink(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function share(): Promise<void> {
    if (!canShareLink()) {
      await copy();
      return;
    }
    try {
      await shareLink({ title: "BikeCheck", text: "Moje garáž na BikeChecku", url });
    } catch {
      // The sheet was dismissed; nothing to say.
    }
  }

  return (
    <Group gap="sm" grow wrap="nowrap">
      <Button
        variant="outline"
        color="primary.5"
        radius="md"
        size={size}
        disabled={!enabled}
        leftSection={copied ? <Check size={16} /> : <Copy size={16} />}
        onClick={() => void copy()}
      >
        {copied ? "Zkopírováno" : "Kopírovat"}
      </Button>
      {withShare && (
        <Button
          variant="outline"
          color="primary.5"
          radius="md"
          size={size}
          disabled={!enabled}
          leftSection={<Share2 size={16} />}
          onClick={() => void share()}
        >
          Sdílet
        </Button>
      )}
      {withOpen && (
        <Button
          variant="outline"
          color="primary.5"
          radius="md"
          size={size}
          disabled={!enabled}
          leftSection={<ExternalLink size={16} />}
          onClick={open}
        >
          Otevřít
        </Button>
      )}
    </Group>
  );
}
