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
      // Match health badge dimensions when badges stack.
      gap={5}
      px={8}
      py={3}
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 55%, transparent)",
        backdropFilter: "blur(4px)",
      }}
    >
      <StravaMark width={10} height={10} color="var(--mantine-color-strava-6)" style={{ display: "block", flexShrink: 0 }} />
      <Text className="font-mono" fz={10} c="var(--mantine-color-strava-6)">
        {t("strava.paired")}
      </Text>
    </Group>
  );
}
