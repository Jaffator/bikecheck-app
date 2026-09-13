// The profile switcher at the top of the Setup sheet: one chip per Setup Profile, the one
// being read highlighted, and a "+" chip to begin another. A bike with no saved profile yet
// shows the unsaved default as its single chip (ADR 0029).
import type { ReactElement } from "react";
import { Box, Chip, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import type { SetupProfile } from "../setup.types";

interface SetupProfileChipsProps {
  profiles: SetupProfile[];
  // Null while the bike has no saved profile: the default chip stands in, already selected.
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  // An Archived Bike keeps its chips to switch between and gets no "+".
  readOnly?: boolean;
}

export function SetupProfileChips({
  profiles,
  selectedId,
  onSelect,
  onCreate,
  readOnly = false,
}: SetupProfileChipsProps): ReactElement {
  const { t } = useTranslation();

  return (
    // Chips run past the edge rather than wrapping: a rider with five profiles scrolls.
    <Box style={{ overflowX: "auto", scrollbarWidth: "none" }}>
      <Group gap="xs" wrap="nowrap">
        {profiles.length === 0 && (
          <Chip checked radius="xl" size="sm" styles={chipStyles(true, { wrap: false })} icon={false}>
            {t("setup.defaultProfileName")}
          </Chip>
        )}

        {profiles.map((profile) => {
          const checked = profile.id === selectedId;
          return (
            <Chip
              key={profile.id}
              checked={checked}
              radius="xl"
              size="sm"
              styles={chipStyles(checked, { wrap: false })}
              icon={false}
              onChange={() => onSelect(profile.id)}
            >
              {profile.name}
            </Chip>
          );
        })}

        {!readOnly && (
          <Chip
            checked={false}
            radius="xl"
            size="sm"
            styles={chipStyles(false, { wrap: false })}
            icon={false}
            aria-label={t("setup.newProfile")}
            onChange={onCreate}
          >
            <Plus size={14} style={{ verticalAlign: "-2px" }} />
          </Chip>
        )}
      </Group>
    </Box>
  );
}
