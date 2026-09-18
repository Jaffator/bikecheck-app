// PROTOTYPE #129 — throwaway. The bits every variant of somebody's profile draws the same:
// the visibility badge, the one control beside the owner (follow, or my own settings),
// the two stand-in screens.
import type { ReactElement } from "react";
import { Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, EyeOff, Globe, Users } from "lucide-react";
import { TRANSPARENT_HEADER_CONTROL } from "@/layout/headerControl";
import { FollowButton, PersonAvatar } from "./FollowButton";
import type { Person } from "./people";
import { usePrototypeStore, VISIBILITY_LABEL, type Visibility } from "./prototype.store";
import { SECONDARY_BUTTON, STATE_COLOR } from "./shared";

export function VisibilityBadge({ visibility, size = 12 }: { visibility: Visibility; size?: number }): ReactElement {
  const color = STATE_COLOR[visibility];
  const Icon = visibility === "PUBLIC" ? Globe : visibility === "FOLLOWERS" ? Users : EyeOff;
  return (
    <Text fz={size} fw={600} style={{ color, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <Icon size={size + 1} />
      {VISIBILITY_LABEL[visibility]}
    </Text>
  );
}

// Beside the owner: on somebody else the follow button; on me the way to my own settings.
export function OwnerAction({
  person,
  owner,
  size = "sm",
  fullWidth = false,
}: {
  person: Person;
  owner: boolean;
  size?: "xs" | "sm";
  fullWidth?: boolean;
}): ReactElement {
  const openDrawer = usePrototypeStore((state) => state.openDrawer);
  if (!owner) return <FollowButton person={person} size={size} fullWidth={fullWidth} />;
  return (
    <Button
      size={size}
      radius="xl"
      variant="default"
      fullWidth={fullWidth}
      styles={{ root: SECONDARY_BUTTON }}
      rightSection={<ChevronRight size={14} />}
      onClick={openDrawer}
      style={{ flexShrink: 0 }}
    >
      Tvůj profil · Nastavení sdílení
    </Button>
  );
}

// One line over my own preview while nobody else can open it.
export function OffNotice(): ReactElement {
  return (
    <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
      Profil je vypnutý — vidíš ho jen ty.
    </Text>
  );
}

// The one 404 screen (#126): OFF, no profile, deleted account, a handle that was renamed.
export function ProfileUnavailable(): ReactElement {
  return (
    <Stack align="center" gap={6} pt="22dvh" px="xl">
      <Text fw={600} fz={17} c="text.6" ta="center">
        Profil není dostupný
      </Text>
      <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
        Majitel ho vypnul, nebo adresa už neplatí.
      </Text>
    </Stack>
  );
}

// The owner as the header title over a transparent header: mini avatar, name, handle.
// On the bike page it is the way back to the garage.
export function OwnerTitle({ person, onClick }: { person: Person; onClick?: () => void }): ReactElement {
  return (
    <UnstyledButton onClick={onClick} px={10} py={4} style={{ ...TRANSPARENT_HEADER_CONTROL, borderRadius: 9999, cursor: onClick ? "pointer" : "default" }}>
      <Group gap={6} wrap="nowrap">
        <PersonAvatar person={person} size={22} />
        <Text fz={15} fw={700} c="text.6" lineClamp={1}>
          {person.name}
        </Text>
        <Text className="font-mono" fz={12} c="var(--color-text-dim)">
          @{person.handle}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

