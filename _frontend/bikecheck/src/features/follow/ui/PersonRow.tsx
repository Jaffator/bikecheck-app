// One person as every list draws them: avatar, name and address, pressable as a whole to
// open their garage. Whatever control the caller puts beside them sits outside the press.
import type { ReactElement, ReactNode } from "react";
import { Avatar, Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ProfileVisibility } from "@/features/profile/profile.types";
import { AVATAR_STYLE } from "@/features/profile/profileSurface";
import { personName } from "../personName";

const AVATAR_SIZE = 40;

// How far a row fades when the profile behind it went Off.
const OFF_OPACITY = 0.55;

// What a row is drawn from - either side's row fits. A follower who never made a profile
// has no handle and nothing to open; only the outgoing side knows a visibility.
export interface Person {
  handle: string | null;
  name: string | null;
  avatar_url: string | null;
  visibility?: ProfileVisibility;
}

interface PersonAvatarProps {
  person: Pick<Person, "name" | "avatar_url">;
  size: number;
}

// The same face the profile hero wears: the picture, or initials on the card colour.
export function PersonAvatar({ person, size }: PersonAvatarProps): ReactElement {
  return <Avatar src={person.avatar_url} name={person.name ?? undefined} radius="xl" size={size} style={AVATAR_STYLE} />;
}

interface PersonRowProps {
  person: Person;
  children?: ReactNode;
}

export function PersonRow({ person, children }: PersonRowProps): ReactElement {
  const navigate = useNavigate();
  const { handle } = person;

  return (
    <Group gap="sm" wrap="nowrap" py={8}>
      {handle === null ? (
        <Box style={{ flex: 1, minWidth: 0 }}>
          <PersonIdentity person={person} />
        </Box>
      ) : (
        <UnstyledButton onClick={() => void navigate(`/users/${handle}`)} style={{ flex: 1, minWidth: 0 }}>
          <PersonIdentity person={person} />
        </UnstyledButton>
      )}
      {children}
    </Group>
  );
}

// The face and the two lines; the address line only when there is one.
function PersonIdentity({ person }: { person: Person }): ReactElement {
  const { t } = useTranslation();
  // A profile that went Off keeps its row, faded: the garage is closed, the choice to leave stays.
  const off = person.visibility === "OFF";
  const faded = off ? { opacity: OFF_OPACITY } : undefined;

  return (
    <Group gap="sm" wrap="nowrap">
      <PersonAvatar person={person} size={AVATAR_SIZE} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fw={600} fz={15} c="text.6" lineClamp={1} style={faded}>
          {personName(person, t("follow.unnamed"))}
        </Text>
        {person.handle !== null && (
          <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1} style={faded}>
            @{person.handle}
          </Text>
        )}
        {off && (
          <Text className="font-mono" fz={11} c="var(--color-text-dim)">
            {t("follow.profileOff")}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
