// PROTOTYPE #129 — throwaway. What stands where the garage would be on a Followers-only
// profile I am not accepted on (garage: null, #126). The button is up in the owner row.
import type { ReactElement } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import { Lock } from "lucide-react";
import type { FollowStatus, Person } from "./people";
import { PANEL } from "./shared";

export function ProfileLocked({ person, relation }: { person: Person; relation: FollowStatus | null }): ReactElement {
  return (
    <Paper radius="lg" p="lg" style={PANEL}>
      <Stack align="center" gap={8}>
        <Lock size={22} color="var(--mantine-color-blue-4)" />
        <Text fw={600} fz={15} c="text.6" ta="center">
          Profil je jen pro sledující
        </Text>
        <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {relation === "PENDING"
            ? `Žádost čeká. Garáž uvidíš, až ji @${person.handle} schválí.`
            : `Garáž uvidíš, až @${person.handle} schválí tvoji žádost.`}
        </Text>
      </Stack>
    </Paper>
  );
}
