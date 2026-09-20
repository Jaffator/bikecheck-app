// The dashboard card: the sharing state and its two figures, or one row inviting the owner
// to share while it is Off. Never hidden; a tap anywhere opens the drawer.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "../profile.queries";
import type { Profile, ProfileVisibility } from "../profile.types";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "../profileVisibility";
import { ShareDrawer } from "./ShareDrawer";

// docs/ui/card-surface.md: a panel, as the bike detail draws its cards - no hairline.
const PANEL: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
};

interface Figure {
  labelKey: string;
  value: number;
  // A waiting request is the one figure that asks for something, so it takes the accent.
  accented: boolean;
}

// Which two numbers a state shows. Followers and requests read 0 until Follow lands (PRD 2).
function figuresFor(visibility: Exclude<ProfileVisibility, "OFF">, profile: Profile): Figure[] {
  const followers: Figure = { labelKey: "sharing.cardFollowers", value: profile.stats.followers, accented: false };
  if (visibility === "FOLLOWERS") {
    const requests = profile.stats.pending_requests;
    return [followers, { labelKey: "sharing.cardRequests", value: requests, accented: requests > 0 }];
  }
  return [followers, { labelKey: "sharing.cardViews", value: profile.stats.views, accented: false }];
}

export function DashboardShareCard(): ReactElement | null {
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  if (!profile) return null;

  return (
    <>
      <UnstyledButton onClick={() => setSharing(true)} className="active:scale-[0.985]" style={{ display: "block" }}>
        {profile.visibility === "OFF" ? (
          <OffRow />
        ) : (
          <StateCard visibility={profile.visibility} figures={figuresFor(profile.visibility, profile)} />
        )}
      </UnstyledButton>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

// Off collapses to one row: an invitation, not a pitch.
function OffRow(): ReactElement {
  const { t } = useTranslation();
  const Icon = VISIBILITY_ICON.OFF;

  return (
    <Paper radius="lg" px="md" py="sm" style={{ ...PANEL, boxShadow: "var(--elev-row)" }}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Icon size={18} color="var(--mantine-color-primary-6)" />
          <Text fw={600} fz={15} c="text.6">
            {t("sharing.cardOff")}
          </Text>
        </Group>
        <ChevronRight size={18} color="var(--color-text-dim)" />
      </Group>
    </Paper>
  );
}

interface StateCardProps {
  visibility: Exclude<ProfileVisibility, "OFF">;
  figures: Figure[];
}

function StateCard({ visibility, figures }: StateCardProps): ReactElement {
  const { t } = useTranslation();
  const Icon = VISIBILITY_ICON[visibility];

  return (
    <Paper radius="lg" p="md" style={{ ...PANEL, boxShadow: "var(--elev-panel)" }}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
            {`${t("sharing.cardTitle")} · ${t(VISIBILITY_LABEL_KEY[visibility])}`}
          </Text>
          <Icon size={16} color={VISIBILITY_COLOR[visibility]} />
        </Group>
        <Group gap={0} grow>
          {figures.map((figure) => (
            <Stack key={figure.labelKey} gap={0}>
              <Text className="font-mono" fz={32} fw={700} c={figure.accented ? "primary.5" : "text.6"} style={{ lineHeight: 1.1 }}>
                {figure.value}
              </Text>
              <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
                {t(figure.labelKey)}
              </Text>
            </Stack>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
