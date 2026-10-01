// The garage's standing state, in one row of small tiles under the work: Strava and who can
// see the garage. Gear to pair and rides to assign are banners at the top of Home (#211).
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

// A list row's surface: the tiles are rows of one kind, not panels.
const TILE: CSSProperties = {
  display: "block",
  width: "100%",
  borderRadius: "var(--mantine-radius-lg)",
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  boxShadow: "var(--elev-row)",
  transition: "transform 0.12s ease",
};

interface TileProps {
  icon: ReactNode;
  // The tint behind the icon, so each tile is told apart by colour before by word.
  tint: string;
  title: string;
  // The figure or the state under the title, in the data voice.
  detail: string;
  onOpen: (() => void) | null;
}

// One tile: an icon disc, two lines, and a chevron when it leads on.
function Tile({ icon, tint, title, detail, onOpen }: TileProps): ReactElement {
  const body = (
    <Group gap="sm" wrap="nowrap" px="sm" py={10} style={{ minWidth: 0 }}>
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.875rem",
          height: "1.875rem",
          borderRadius: "0.5rem",
          flexShrink: 0,
          backgroundColor: `color-mix(in srgb, ${tint} 14%, transparent)`,
        }}
      >
        {icon}
      </Box>
      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={13} fw={600} c="text.6" lineClamp={1}>
          {title}
        </Text>
        <Text
          className="tabular-nums"
          fz={11}
          tt="uppercase"
          lts="var(--tracking-label)"
          c="var(--color-text-dim)"
          lineClamp={1}
        >
          {detail}
        </Text>
      </Stack>
      {onOpen !== null && <ChevronRight size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
    </Group>
  );

  if (onOpen === null) return <Box style={TILE}>{body}</Box>;
  return (
    <UnstyledButton onClick={onOpen} className="active:scale-[0.985]" style={TILE}>
      {body}
    </UnstyledButton>
  );
}

export function StatusRow(): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);

  const stravaConnected = Boolean(user?.strava_athlete_id);

  const tiles: ReactElement[] = [];

  // Strava reports; it is not a way anywhere. The pitch for an unconnected account is a
  // card of its own on the page, not a tile.
  if (stravaConnected) {
    tiles.push(
      <Tile
        key="strava"
        icon={<StravaMark width={15} height={15} color="var(--mantine-color-strava-6)" />}
        tint="var(--mantine-color-strava-6)"
        title={t("strava.statusTitle")}
        detail={t("strava.statusConnectedShort")}
        onOpen={null}
      />,
    );
  }

  // Never hidden (#135) and always the drawer: the tile is "my sharing"; "my people" and the
  // waiting requests live on the More tab's sheet (#156, #158).
  if (profile) {
    const Icon = VISIBILITY_ICON[profile.visibility];
    const color = VISIBILITY_COLOR[profile.visibility];
    const detail =
      profile.visibility === "OFF"
        ? t(VISIBILITY_LABEL_KEY.OFF)
        : `${profile.stats.followers} ${t("sharing.cardFollowers")} · ${profile.stats.views} ${t("sharing.cardViews")}`;

    tiles.push(
      <Tile
        key="sharing"
        icon={<Icon size={15} color={color} />}
        tint={color}
        title={`${t("sharing.cardTitle")} · ${t(VISIBILITY_LABEL_KEY[profile.visibility])}`}
        detail={detail}
        onOpen={() => setSharing(true)}
      />,
    );
  }

  if (tiles.length === 0) return null;

  return (
    <>
      {/* Two to a row on a phone, a tile left alone at the end taking the whole row; one to
          a row in the browser's side column, which is only half as wide. */}
      <Grid gap="sm" align="start">
        {tiles.map((tile, index) => {
          const alone = index === tiles.length - 1 && tiles.length % 2 === 1;
          return (
            <Grid.Col key={tile.key} span={{ base: alone ? 12 : 6, sm: 12 }}>
              {tile}
            </Grid.Col>
          );
        })}
      </Grid>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}
