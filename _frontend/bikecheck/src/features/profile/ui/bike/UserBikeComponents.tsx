// The build of somebody's bike as one panel: each Component Category heads its parts, and a
// part is a plain row - what it is, what the owner called it, how far it has come. Nothing
// here opens: a reader looks, the owner corrects on their own page.
import type { ReactElement } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { Wrench } from "lucide-react";
import { IoLogoWebComponent } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import { positionLabel } from "@/features/components/componentLabels";
import { useSeededName } from "@/i18n/useSeededName";
import { formatKm } from "../../profileFormat";
import { EYEBROW, PANEL } from "../../profileSurface";
import type { ProfileCatalogueName, ProfileComponentGroup, ProfileMountedPart } from "../../profile.types";
import { UserBikeSectionTitle } from "./UserBikeSectionTitle";

const CATEGORY_ICON_SIZE = 22;
// A part row starts where the category's name does, past its icon.
const PART_INDENT = 50;

interface UserBikeComponentsProps {
  groups: ProfileComponentGroup[];
}

export function UserBikeComponents({ groups }: UserBikeComponentsProps): ReactElement | null {
  const { t } = useTranslation();
  const seededName = useSeededName();
  const total = groups.reduce((sum, group) => sum + group.parts.length, 0);

  // An empty build has nothing to read; the hero's count already says so.
  if (groups.length === 0) return null;

  return (
    <Paper radius="lg" style={{ ...PANEL, overflow: "hidden" }}>
      <UserBikeSectionTitle
        icon={<IoLogoWebComponent size={16} />}
        aside={<Text {...EYEBROW}>{t("sharing.partsCount", { count: total })}</Text>}
      >
        {t("sharing.bikeComponentsTitle")}
      </UserBikeSectionTitle>

      <Stack gap={0}>
        {groups.map((group) => (
          <Box key={group.category.name} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <Group gap="sm" wrap="nowrap" px="md" pt={12} pb={4}>
              <Box style={{ display: "flex", color: "var(--mantine-color-text-8)", flexShrink: 0 }}>
                {categoryMark(group.category)}
              </Box>
              <Text fz={15} fw={600} c="text.6" lineClamp={1}>
                {seededName(group.category.i18n_key, group.category.name)}
              </Text>
              <Text {...EYEBROW} ml="auto">
                {group.parts.length}
              </Text>
            </Group>
            {group.parts.map((part) => (
              <PartRow key={part.id} part={part} />
            ))}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

// The category's icon is keyed on the seeded English name; anything the seed does not know
// takes the wrench.
function categoryMark(category: ProfileCatalogueName): ReactElement {
  const Icon = groupIcon(category.name);
  if (Icon === null) return <Wrench size={20} />;
  return <Icon width={CATEGORY_ICON_SIZE} height={CATEGORY_ICON_SIZE} />;
}

function PartRow({ part }: { part: ProfileMountedPart }): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const position = positionLabel(part.position, t);
  const described = part.description?.trim();

  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" px="md" py={8} pl={PART_INDENT}>
      <Stack gap={1} style={{ minWidth: 0, flex: 1 }}>
        <Group gap={6} wrap="nowrap">
          <Text fz={14} fw={600} c="text.6" lineClamp={1}>
            {seededName(part.type.i18n_key, part.type.name)}
          </Text>
          {position !== null && (
            <Text {...EYEBROW} style={{ flexShrink: 0 }}>
              {position}
            </Text>
          )}
        </Group>
        {/* Wraps: a part's full name is what the reader came for, a cut one says nothing. */}
        {described !== undefined && described !== "" && (
          <Text fz={13} c="var(--color-text-dim)">
            {described}
          </Text>
        )}
      </Stack>
      <Text className="font-mono" fz={11} c="var(--color-text-dim)" pt={2} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
        {part.distance_km === null ? t("sharing.sinceNew") : formatKm(part.distance_km, i18n.language)}
      </Text>
    </Group>
  );
}
