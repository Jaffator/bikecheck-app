// The mark a bike linked to Strava gear wears in the corner of its photo, the same in the
// garage and on the bike's own page.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

export function StravaLinkedBadge({ stravaGearId }: { stravaGearId: string | null }): ReactElement | null {
  const { t } = useTranslation();

  if (stravaGearId === null) return null;

  return (
    <Group
      // The health badge's pill, since the two stack in one corner.
      gap={6}
      h={26}
      pl={8}
      pr={10}
      wrap="nowrap"
      style={{
        borderRadius: "9999px",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 13%, var(--mantine-color-cards-6))",
      }}
    >
      <StravaMark width={12} height={12} color="var(--mantine-color-strava-6)" style={{ display: "block", flexShrink: 0 }} />
      <Text className="tabular-nums" fz={12} fw={600} c="var(--mantine-color-strava-6)" style={{ whiteSpace: "nowrap" }}>
        {t("strava.paired")}
      </Text>
    </Group>
  );
}
