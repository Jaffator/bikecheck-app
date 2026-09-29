// The dashboard card: the sharing state, its heading opening the drawer, its people figures
// leading to the followers tab. Off collapses to one row opening the drawer. Never hidden.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
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
  // The people figure is a way somewhere; Views is a count, nothing to open.
  linked: boolean;
}

// The two numbers the card shows; waiting requests live on the More sheet alone (#156, #158).
function figuresFor(profile: Profile): Figure[] {
  return [
    { labelKey: "sharing.cardFollowers", value: profile.stats.followers, linked: true },
    { labelKey: "sharing.cardViews", value: profile.stats.views, linked: false },
  ];
}

export function DashboardShareCard(): ReactElement | null {
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  if (!profile) return null;

  return (
    <>
      {profile.visibility === "OFF" ? (
        <OffRow onOpenDrawer={() => setSharing(true)} />
      ) : (
        <StateCard visibility={profile.visibility} figures={figuresFor(profile)} onOpenDrawer={() => setSharing(true)} />
      )}

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

// Off collapses to one row: "my sharing" with nothing to count, a tap opening the drawer;
// "my people" is the Riders card in the More sheet (#156, #158).
function OffRow({ onOpenDrawer }: { onOpenDrawer: () => void }): ReactElement {
  const { t } = useTranslation();
  const OffIcon = VISIBILITY_ICON.OFF;

  return (
    <UnstyledButton onClick={onOpenDrawer} className="active:scale-[0.985]" style={{ display: "block" }}>
      <Paper radius="lg" px="md" py="sm" style={{ ...PANEL, boxShadow: "var(--elev-row)" }}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <OffIcon size={18} color={VISIBILITY_COLOR.OFF} />
            <Text fw={600} fz={15} c="text.6">
              {`${t("sharing.cardTitle")} · ${t(VISIBILITY_LABEL_KEY.OFF)}`}
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
      <Text className="font-mono" fz={32} fw={700} c="text.6" style={{ lineHeight: 1.1 }}>
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
