// The profile switcher at the top of the Setup sheet: one chip per Setup Profile, the one
// being read highlighted. A bike with no saved profile yet shows the unsaved default as its
// single chip (ADR 0029). Beginning another profile lives in the menu beside the chips.
import type { CSSProperties as ReactCSSProperties, ReactElement } from "react";
import { Box, Chip, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import type { SetupProfile } from "../setup.types";

// The chips ride on the page, not on a panel, so each one is a raised pill against it. The
// one being read is the only warm thing in the row, which is what tells it apart at a glance.
function rowChipStyles(checked: boolean): ReturnType<typeof chipStyles> {
  const base = chipStyles(checked, { wrap: false, opaque: true });
  return {
    ...base,
    label: {
      ...base.label,
      backgroundColor: checked
        ? "color-mix(in srgb, var(--mantine-color-primary-6) 18%, var(--mantine-color-cards-6))"
        : "var(--mantine-color-cards-6)",
      borderColor: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-inputs-5)",
      color: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-7)",
      boxShadow: "var(--elev-row)",
    } as ReactCSSProperties,
  };
}

// Both ends of the row are softened; the left one is shorter, since the first chip usually
// starts there.
const MASK = "linear-gradient(to right, transparent 0%, #000 1%, #000 99%, transparent 100%)";

interface SetupProfileChipsProps {
  profiles: SetupProfile[];
  // Null while the bike has no saved profile: the default chip stands in, already selected.
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function SetupProfileChips({ profiles, selectedId, onSelect }: SetupProfileChipsProps): ReactElement {
  const { t } = useTranslation();

  return (
    // Chips run past the edge rather than wrapping: a rider with five profiles scrolls.
    <Box
      style={{
        overflowX: "auto",
        scrollbarWidth: "none",
        // Says the row runs on at either edge rather than ending on a half-read name.
        maskImage: MASK,
        WebkitMaskImage: MASK,
      }}
    >
      {/* A hair of room at either end, so the first and last chip do not touch the card's edge. */}
      <Group gap="xs" wrap="nowrap" px={2}>
        {profiles.length === 0 && (
          <Chip checked radius="xl" size="sm" styles={rowChipStyles(true)} icon={false}>
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
              styles={rowChipStyles(checked)}
              icon={false}
              onChange={() => onSelect(profile.id)}
            >
              {profile.name}
            </Chip>
          );
        })}
      </Group>
    </Box>
  );
}
