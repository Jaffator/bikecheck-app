// The owner as a hero card on their garage page: avatar, name, address and state, the way
// to the sharing settings when the garage is mine, and under a hairline the numbers the
// listed bikes add up to. A locked garage shows the card without the numbers.
import type { ReactElement } from "react";
import { Avatar, Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "react-i18next";
import { formatKm } from "../profileFormat";
import { AVATAR_STYLE, PANEL } from "../profileSurface";
import type { ProfileGarage, ProfileGarageResponse } from "../profile.types";
import { VisibilityBadge } from "./VisibilityBadge";

dayjs.extend(relativeTime);

const AVATAR_SIZE = 64;

interface Figure {
  label: string;
  value: string;
}

interface UserProfileHeroProps {
  page: ProfileGarageResponse;
  // Set only on my own preview: opens the share drawer over it.
  onOpenSharing?: () => void;
}

export function UserProfileHero({ page, onOpenSharing }: UserProfileHeroProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { owner, garage } = page;

  return (
    <Paper radius="lg" p="md" style={PANEL}>
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap" align="center">
          <Avatar src={owner.avatar_url} name={owner.name ?? undefined} radius="xl" size={AVATAR_SIZE} style={AVATAR_STYLE} />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} fz={18} c="text.6" lineClamp={1} lh={1.2}>
              {owner.name}
            </Text>
            <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
              @{owner.handle}
            </Text>
            <VisibilityBadge visibility={page.visibility} />
          </Stack>
        </Group>

        {/* Too long a label to share the row with the name on a phone, so it takes its own. */}
        {onOpenSharing && (
          <Button
            size="sm"
            radius="xl"
            variant="outline"
            fullWidth
            rightSection={<ChevronRight size={14} />}
            onClick={onOpenSharing}
          >
            {t("sharing.ownerAction")}
          </Button>
        )}

        {garage && (
          <>
            <Divider color="var(--color-border-subtle)" />
            <Group gap="lg" wrap="nowrap" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
              {figuresOf(garage, i18n.language, t).map((figure) => (
                <Stack key={figure.label} gap={2} style={{ flexShrink: 0 }}>
                  <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
                    {figure.label}
                  </Text>
                  <Text className="font-mono" fz={17} fw={600} c="text.6" lh={1.1}>
                    {figure.value}
                  </Text>
                </Stack>
              ))}
            </Group>
            <Text className="font-mono" fz={11} c="var(--color-text-dim)">
              {t("sharing.updatedAt", { when: dayjs(garage.updated_at).fromNow() })}
            </Text>
          </>
        )}
      </Stack>
    </Paper>
  );
}

// Bikes and distance always; parts and Services only while the owner shares the section.
function figuresOf(garage: ProfileGarage, language: string, t: (key: string) => string): Figure[] {
  const figures: Figure[] = [
    { label: t("sharing.figureBikes"), value: String(garage.totals.bikes) },
    { label: t("sharing.figureDistance"), value: formatKm(garage.totals.distance_km, language) },
  ];
  if (garage.totals.components !== null) {
    figures.push({ label: t("sharing.figureParts"), value: String(garage.totals.components) });
  }
  if (garage.totals.services !== null) {
    figures.push({ label: t("sharing.figureServices"), value: String(garage.totals.services) });
  }
  return figures;
}
