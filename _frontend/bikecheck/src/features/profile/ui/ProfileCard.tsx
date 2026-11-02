// Desktop Riders' side card: who I am to the people in the list, how visible, and my address.
// Sharing is set in the drawer alone, so both the heading's Upravit and the state row open it.
import { useEffect, useState, type ReactElement } from "react";
import { Avatar, Button, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { Check, ChevronRight, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { trackEvent } from "@/utils/analytics";
import { copyLink } from "@/utils/shareLink";
import { profileUrl } from "../handle";
import { useMyProfile } from "../profile.queries";
import type { Profile } from "../profile.types";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "../profileVisibility";
import { AVATAR_STYLE, PANEL } from "../profileSurface";
import { ShareDrawer } from "./ShareDrawer";

const AVATAR_SIZE = 44;
const ROW_HEIGHT = 44;
const COPIED_FOR_MS = 2000;

export function ProfileCard(): ReactElement | null {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  if (profile === undefined) return null;

  return (
    <Paper p="md" style={PANEL}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Eyebrow>{t("sharing.profileCardTitle")}</Eyebrow>
          <UnstyledButton onClick={() => setSharing(true)}>
            <Text fz={13} fw={500} c="primary.5">
              {t("sharing.profileCardEdit")}
            </Text>
          </UnstyledButton>
        </Group>
        <Identity profile={profile} />
        <Stack gap={0}>
          <VisibilityRow profile={profile} onOpen={() => setSharing(true)} />
          {/* Only a saved Public profile has a page the address opens. */}
          {profile.visibility === "PUBLIC" && profile.handle !== null && (
            <AddressRow url={profileUrl(profile.public_origin, profile.handle)} />
          )}
        </Stack>
      </Stack>
      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </Paper>
  );
}

function Identity({ profile }: { profile: Profile }): ReactElement {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const facts = [
    profile.handle === null ? null : `@${profile.handle}`,
    bikes === undefined ? null : t("sharing.profileCardBikes", { count: bikes.length }),
    t("sharing.profileCardFollowers", { count: profile.stats.followers }),
  ].filter((fact) => fact !== null);

  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar src={user?.avatar_url} name={user?.name} radius="xl" size={AVATAR_SIZE} style={AVATAR_STYLE} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fw={600} fz={15} c="text.6" lineClamp={1}>
          {user?.name}
        </Text>
        <Text className="tabular-nums" fz={12} c="var(--color-text-dim)" lineClamp={1}>
          {facts.join(" · ")}
        </Text>
      </Stack>
    </Group>
  );
}

function VisibilityRow({ profile, onOpen }: { profile: Profile; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();
  const Icon = VISIBILITY_ICON[profile.visibility];

  return (
    <UnstyledButton onClick={onOpen} h={ROW_HEIGHT} style={{ borderTop: PANEL_HAIRLINE }}>
      <Group justify="space-between" wrap="nowrap" h="100%">
        <Text fz={14} c="text.6">
          {t("sharing.profileCardVisibility")}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Icon size={15} color={VISIBILITY_COLOR[profile.visibility]} />
          <Text fz={14} c="var(--color-text-dim)">
            {t(VISIBILITY_LABEL_KEY[profile.visibility])}
          </Text>
          <ChevronRight size={16} color="var(--color-text-dim)" />
        </Group>
      </Group>
    </UnstyledButton>
  );
}

function AddressRow({ url }: { url: string }): ReactElement {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

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
      trackEvent("share-profile");
    } catch {
      setCopied(false);
    }
  }

  const accent = "var(--mantine-color-primary-5)";
  return (
    <Group justify="space-between" wrap="nowrap" h={ROW_HEIGHT} style={{ borderTop: PANEL_HAIRLINE }}>
      <Text className="tabular-nums" fz={13} c="var(--color-text-dim)" truncate>
        {url.replace(/^https?:\/\//, "")}
      </Text>
      <Button
        variant="outline"
        radius="md"
        size="xs"
        style={{ flexShrink: 0 }}
        leftSection={copied ? <Check size={14} color={accent} /> : <Copy size={14} color={accent} />}
        onClick={() => void copy()}
      >
        {copied ? t("sharing.copied") : t("sharing.copy")}
      </Button>
    </Group>
  );
}
