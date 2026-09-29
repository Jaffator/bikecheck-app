// The owner as the header title over the bike's photo - mini avatar, name, handle - and
// the way back to their garage. Draws its own shade: the transparent header gives none.
import type { ReactElement } from "react";
import { Avatar, Group, Text, UnstyledButton } from "@mantine/core";
import { TRANSPARENT_HEADER_CONTROL } from "@/layout/headerControl";
import { AVATAR_STYLE } from "../../profileSurface";
import type { ProfileOwner } from "../../profile.types";

const AVATAR_SIZE = 22;

interface UserBikeOwnerPillProps {
  owner: ProfileOwner;
  onClick: () => void;
}

export function UserBikeOwnerPill({ owner, onClick }: UserBikeOwnerPillProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      px={10}
      py={4}
      style={{ ...TRANSPARENT_HEADER_CONTROL, borderRadius: 9999, minWidth: 0 }}
    >
      <Group gap={6} wrap="nowrap">
        <Avatar src={owner.avatar_url} name={owner.name ?? undefined} radius="xl" size={AVATAR_SIZE} style={AVATAR_STYLE} />
        <Text fz={15} fw={700} c="text.6" lineClamp={1}>
          {owner.name}
        </Text>
        <Text className="font-mono" fz={12} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
          @{owner.handle}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
