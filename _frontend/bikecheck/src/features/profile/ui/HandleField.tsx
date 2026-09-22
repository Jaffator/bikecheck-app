// The address panel of the share drawer, shown for a Public profile only: the handle as it
// is typed, the full link under it, and the two things to do with the link.
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { Browser } from "@capacitor/browser";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { copyLink } from "@/utils/shareLink";
import { HANDLE_ERROR_KEY, normalizeHandle, profileUrl } from "../handle";
import type { HandleErrorCode } from "../profile.types";

// Long enough for the owner to read that it worked, short enough not to sit there.
const COPIED_FOR_MS = 1500;
const PREFIX_WIDTH = 36;

const HANDLE_INPUT_STYLES = {
  ...inputStyles,
  input: {
    ...inputStyles.input,
    fontFamily: "var(--font-mono)",
    paddingLeft: PREFIX_WIDTH,
    "--input-disabled-bg": "var(--mantine-color-cards-7)",
    "--input-disabled-color": "var(--mantine-color-text-9)",
  } as CSSProperties,
};

interface HandleFieldProps {
  handle: string;
  onChange: (handle: string) => void;
  // Leaving the field (or Enter) is when a typed handle is saved.
  onCommit: () => void;
  error: HandleErrorCode | null;
  origin: string;
  // What Kopírovat and Otevřít hand out: the saved link, null while what is saved is not Public.
  savedUrl: string | null;
}

export function HandleField({ handle, onChange, onCommit, error, origin, savedUrl }: HandleFieldProps): ReactElement {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = profileUrl(origin, handle);
  const linkEnabled = savedUrl !== null && error === null;
  const dim = "var(--color-text-dim)";
  // The one accent on a quiet button; gone with it when disabled.
  const accent = linkEnabled ? "var(--mantine-color-primary-5)" : undefined;

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  // Nothing is claimed until the clipboard has actually taken it.
  async function copy(): Promise<void> {
    if (savedUrl === null) return;
    try {
      await copyLink(savedUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function open(): void {
    if (savedUrl !== null) void Browser.open({ url: savedUrl });
  }

  return (
    <Stack gap={8} pt={8} pb={8}>
      <TextInput
        value={handle}
        onChange={(event) => onChange(normalizeHandle(event.currentTarget.value))}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        leftSection={
          <Text className="font-mono" fz={13} c={dim} pl={4}>
            /u/
          </Text>
        }
        leftSectionWidth={PREFIX_WIDTH}
        error={error === null ? undefined : t(HANDLE_ERROR_KEY[error])}
        styles={HANDLE_INPUT_STYLES}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label={t("sharing.sectionAddress")}
      />
      <Text className="font-mono" fz={12} c={dim} truncate>
        {url}
      </Text>
      <Group gap="sm" grow wrap="nowrap">
        <Button
          variant="outline"
          radius="md"
          size="sm"
          disabled={!linkEnabled}
          leftSection={copied ? <Check size={16} color={accent} /> : <Copy size={16} color={accent} />}
          onClick={() => void copy()}
        >
          {copied ? t("sharing.copied") : t("sharing.copy")}
        </Button>
        <Button
          variant="outline"
          radius="md"
          size="sm"
          disabled={!linkEnabled}
          leftSection={<ExternalLink size={16} color={accent} />}
          onClick={open}
        >
          {t("sharing.open")}
        </Button>
      </Group>
    </Stack>
  );
}
