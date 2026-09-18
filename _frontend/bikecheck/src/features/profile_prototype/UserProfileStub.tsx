// PROTOTYPE #128 — throwaway. Where a row on /follows lands: the top of somebody's profile
// (#126), enough to feel the way there and back and to see the follow button at its
// regular size. The screen itself is #129's prototype.
import { useEffect, type ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useParams } from "react-router-dom";
import { Globe, Users } from "lucide-react";
import { useHeaderStore } from "@/store/store";
import { FollowButton, PersonAvatar } from "./FollowButton";
import { findPerson } from "./people";
import { VISIBILITY_LABEL } from "./prototype.store";
import { STATE_COLOR } from "./shared";

export function UserProfileStub(): ReactElement {
  const { handle = "" } = useParams();
  const person = findPerson(handle);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);

  useEffect(() => {
    setTitleSlot(
      <Text fw={700} size="lg" c="text.6" className="font-mono">
        @{handle}
      </Text>,
    );
    return () => setTitleSlot(null);
  }, [setTitleSlot, handle]);

  if (!person || person.visibility === "OFF") {
    return (
      <Stack align="center" pt="20dvh" px="xl">
        <Text fw={600} fz={17} c="text.6" ta="center">
          Profil není dostupný
        </Text>
      </Stack>
    );
  }

  const color = STATE_COLOR[person.visibility];

  return (
    <Stack gap="lg" p="md">
      <Group gap="sm" wrap="nowrap">
        <PersonAvatar person={person} size={56} />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} fz={17} c="text.6" lineClamp={1}>
            {person.name}
          </Text>
          <Group gap={4} wrap="nowrap" style={{ color }}>
            {person.visibility === "PUBLIC" ? <Globe size={13} /> : <Users size={13} />}
            <Text fz={12} fw={600} style={{ color: "inherit" }}>
              {VISIBILITY_LABEL[person.visibility]}
            </Text>
          </Group>
        </Stack>
        <FollowButton person={person} size="sm" />
      </Group>
      <Text fz={13} c="var(--color-text-dim)" ta="center" pt="xl">
        Cizí profil v appce — prototyp #129.
      </Text>
    </Stack>
  );
}
