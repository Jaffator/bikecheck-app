// The dashboard card: the sharing state, its heading opening the drawer, its people figures
// leading to the followers tab. Off collapses to one row leading to /follows. Never hidden.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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

// Where the people figures lead: the owner's side of the Follows page.
const FOLLOWERS_TAB = "/follows?tab=followers";

interface Figure {
  labelKey: string;
  value: number;
  // A waiting request is the one figure that asks for something, so it takes the accent.
  accented: boolean;
  // The people figures are a way somewhere; Views is a count, nothing to open.
  linked: boolean;
}

// Which two numbers a state shows.
function figuresFor(visibility: Exclude<ProfileVisibility, "OFF">, profile: Profile): Figure[] {
  const followers: Figure = {
    labelKey: "sharing.cardFollowers",
    value: profile.stats.followers,
    accented: false,
    linked: true,
  };
  if (visibility === "FOLLOWERS") {
    const requests = profile.stats.pending_requests;
    return [followers, { labelKey: "sharing.cardRequests", value: requests, accented: requests > 0, linked: true }];
  }
  return [followers, { labelKey: "sharing.cardViews", value: profile.stats.views, accented: false, linked: false }];
}

export function DashboardShareCard(): ReactElement | null {
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  if (!profile) return null;

  return (
    <>
      {profile.visibility === "OFF" ? (
        <OffRow />
      ) : (
        <StateCard
          visibility={profile.visibility}
          figures={figuresFor(profile.visibility, profile)}
          onOpenDrawer={() => setSharing(true)}
        />
      )}

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

// Off collapses to one row: the way to the Follows page, not a pitch to share.
function OffRow(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <UnstyledButton onClick={() => void navigate("/follows")} className="active:scale-[0.985]" style={{ display: "block" }}>
      <Paper radius="lg" px="md" py="sm" style={{ ...PANEL, boxShadow: "var(--elev-row)" }}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Users size={18} color="var(--mantine-color-primary-6)" />
            <Text fw={600} fz={15} c="text.6">
              {t("page.follows")}
            </Text>
          </Group>
          <ChevronRight size={18} color="var(--color-text-dim)" />
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

interface StateCardProps {
  visibility: Exclude<ProfileVisibility, "OFF">;
  figures: Figure[];
  onOpenDrawer: () => void;
}

function StateCard({ visibility, figures, onOpenDrawer }: StateCardProps): ReactElement {
  const { t } = useTranslation();
  const Icon = VISIBILITY_ICON[visibility];

  return (
    <Paper radius="lg" p="md" style={{ ...PANEL, boxShadow: "var(--elev-panel)" }}>
      <Stack gap="sm">
        {/* The heading is the drawer's handle; the figures below are each their own way. */}
        <UnstyledButton onClick={onOpenDrawer} className="active:scale-[0.985]" style={{ display: "block" }}>
          <Group justify="space-between" wrap="nowrap">
            <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
              {`${t("sharing.cardTitle")} · ${t(VISIBILITY_LABEL_KEY[visibility])}`}
            </Text>
            <Icon size={16} color={VISIBILITY_COLOR[visibility]} />
          </Group>
        </UnstyledButton>
        <Group gap={0} grow>
          {figures.map((figure) => (
            <FigureCell key={figure.labelKey} figure={figure} />
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}

// One figure: a button with a chevron by its label when it leads somewhere, a number otherwise.
function FigureCell({ figure }: { figure: Figure }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const body = (
    <Stack gap={0}>
      <Text className="font-mono" fz={32} fw={700} c={figure.accented ? "primary.5" : "text.6"} style={{ lineHeight: 1.1 }}>
        {figure.value}
      </Text>
      <Group gap={2} wrap="nowrap">
        <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
          {t(figure.labelKey)}
        </Text>
        {figure.linked && <ChevronRight size={12} color="var(--color-text-dim)" />}
      </Group>
    </Stack>
  );

  if (!figure.linked) return body;
  return (
    <UnstyledButton onClick={() => void navigate(FOLLOWERS_TAB)} className="active:scale-[0.97]" style={{ display: "block" }}>
      {body}
    </UnstyledButton>
  );
}
