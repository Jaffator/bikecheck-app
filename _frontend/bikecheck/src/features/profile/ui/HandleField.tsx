// The address panel of the share drawer: the handle as it is typed, the full link under it,
// and the two things to do with the link - which only a Public profile has a page for.
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { Button, Group, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { Browser } from "@capacitor/browser";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { copyLink } from "@/utils/shareLink";
import { HANDLE_ERROR_KEY, normalizeHandle, profileUrl } from "../handle";
import type { HandleErrorCode, ProfileVisibility } from "../profile.types";

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
  error: HandleErrorCode | null;
  origin: string;
  visibility: ProfileVisibility;
  disabled: boolean;
}

export function HandleField({ handle, onChange, error, origin, visibility, disabled }: HandleFieldProps): ReactElement {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = profileUrl(origin, handle);
  const linkEnabled = visibility === "PUBLIC" && error === null;
  const dim = disabled ? "text.9" : "var(--color-text-dim)";

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  // Nothing is claimed until the clipboard has actually taken it.
  async function copy(): Promise<void> {
    try {
      await copyLink(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Stack gap={8} pt={8} pb={8}>
      <TextInput
        value={handle}
        disabled={disabled}
        onChange={(event) => onChange(normalizeHandle(event.currentTarget.value))}
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
          color="primary.5"
          radius="md"
          size="sm"
          disabled={!linkEnabled}
          leftSection={copied ? <Check size={16} /> : <Copy size={16} />}
          onClick={() => void copy()}
        >
          {copied ? t("sharing.copied") : t("sharing.copy")}
        </Button>
        <Button
          variant="outline"
          color="primary.5"
          radius="md"
          size="sm"
          disabled={!linkEnabled}
          leftSection={<ExternalLink size={16} />}
          onClick={() => void Browser.open({ url })}
        >
          {t("sharing.open")}
        </Button>
      </Group>
      {visibility === "FOLLOWERS" && (
        <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {t("sharing.linkFollowersHint")}
        </Text>
      )}
      {/* Wired to /users/<handle> once that screen exists; until then it only says it is coming. */}
      <UnstyledButton disabled style={{ cursor: "default" }}>
        <Text fz={13} fw={600} c="text.9">
          {t("sharing.preview")}
        </Text>
      </UnstyledButton>
    </Stack>
  );
}
