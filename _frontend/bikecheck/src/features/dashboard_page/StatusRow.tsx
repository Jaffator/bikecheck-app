// The garage's standing state, in one row of small tiles under the work: Strava, gear left
// to pair, rides left to assign, and who can see the garage. Each used to be a card of its
// own above the work; here they are a glance, and a tap where there is something to do.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Link2Off } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useBikes } from "@/features/bikes/bikes.queries";
import { usePendingRides } from "@/features/strava/strava.queries";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
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
          className="font-mono"
          fz={11}
          tt="uppercase"
          lts="0.06em"
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
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const { data: rides } = usePendingRides();
  const { data: profile } = useMyProfile();
  const [pairingGear, setPairingGear] = useState(false);
  const [sharing, setSharing] = useState(false);

  const stravaConnected = Boolean(user?.strava_athlete_id);
  const unpairedCount = stravaConnected ? (bikes ?? []).filter((bike) => bike.strava_gear_id === null).length : 0;
  const pendingCount = stravaConnected ? (rides?.length ?? 0) : 0;

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

  if (unpairedCount > 0) {
    tiles.push(
      <Tile
        key="unpaired"
        icon={<Link2Off size={15} color="var(--mantine-color-primary-6)" />}
        tint="var(--mantine-color-primary-6)"
        title={t("strava.unpairedBikesAction")}
        detail={t("strava.unpairedTile", { count: unpairedCount })}
        onOpen={() => setPairingGear(true)}
      />,
    );
  }

  if (pendingCount > 0) {
    tiles.push(
      <Tile
        key="pending"
        icon={<CalendarClock size={15} color="var(--mantine-color-primary-6)" />}
        tint="var(--mantine-color-primary-6)"
        title={t("pendingRides.title")}
        detail={t("pendingRides.tileDetail", { count: pendingCount })}
        onOpen={() => navigate("/rides?tab=pending")}
      />,
    );
  }

  // Never hidden (#135) and always the drawer: the tile is "my sharing"; "my people" and the
  // waiting requests live on the Users icon in the top bar (#156).
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

      <GearLinkingSheet opened={pairingGear} onClose={() => setPairingGear(false)} />
      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}
