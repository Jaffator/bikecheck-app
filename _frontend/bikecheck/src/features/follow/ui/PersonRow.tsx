// One person as every list draws them: avatar, name and address, pressable as a whole to
// open their garage. Whatever control the caller puts beside them sits outside the press.
import type { ReactElement, ReactNode } from "react";
import { Avatar, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AVATAR_STYLE } from "@/features/profile/profileSurface";
import type { FollowingRow } from "../follow.types";

const AVATAR_SIZE = 40;

// How far a row fades when the profile behind it went Off.
const OFF_OPACITY = 0.55;

interface PersonAvatarProps {
  person: Pick<FollowingRow, "name" | "avatar_url">;
  size: number;
}

// The same face the profile hero wears: the picture, or initials on the card colour.
export function PersonAvatar({ person, size }: PersonAvatarProps): ReactElement {
  return <Avatar src={person.avatar_url} name={person.name ?? undefined} radius="xl" size={size} style={AVATAR_STYLE} />;
}

interface PersonRowProps {
  person: FollowingRow;
  children?: ReactNode;
}

export function PersonRow({ person, children }: PersonRowProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // A profile that went Off keeps its row, faded: the garage is closed, the choice to leave stays.
  const off = person.visibility === "OFF";
  const faded = off ? { opacity: OFF_OPACITY } : undefined;

  return (
    <Group gap="sm" wrap="nowrap" py={8}>
      <UnstyledButton onClick={() => void navigate(`/users/${person.handle}`)} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="sm" wrap="nowrap">
          <PersonAvatar person={person} size={AVATAR_SIZE} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={600} fz={15} c="text.6" lineClamp={1} style={faded}>
              {/* An account without a name is named by its address, as the notifications name it. */}
              {person.name ?? `@${person.handle}`}
            </Text>
            <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1} style={faded}>
              @{person.handle}
            </Text>
            {off && (
              <Text className="font-mono" fz={11} c="var(--color-text-dim)">
                {t("follow.profileOff")}
              </Text>
            )}
          </Stack>
        </Group>
      </UnstyledButton>
      {children}
    </Group>
  );
}
