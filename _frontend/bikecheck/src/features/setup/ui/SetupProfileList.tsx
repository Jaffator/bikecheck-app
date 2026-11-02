// Desktop's profile switcher: every Setup Profile in a column, the one being read highlighted.
// A bike with no saved profile shows the unsaved default as its single row (ADR 0029).
import type { ReactElement } from "react";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { SetupProfile } from "../setup.types";

// The selected chip's tint, so a picked profile reads the same as on the phone.
const SELECTED_TINT = "color-mix(in srgb, var(--mantine-color-primary-6) 20%, var(--mantine-color-cards-6))";
const ROW_HEIGHT = 40;

interface SetupProfileListProps {
  profiles: SetupProfile[];
  // Null while the bike has no saved profile: the default row stands in, already selected.
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function SetupProfileList({ profiles, selectedId, onSelect }: SetupProfileListProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={4}>
      {profiles.length === 0 && <ProfileRow name={t("setup.defaultProfileName")} selected />}
      {profiles.map((profile) => (
        <ProfileRow
          key={profile.id}
          name={profile.name}
          selected={profile.id === selectedId}
          onClick={() => onSelect(profile.id)}
        />
      ))}
    </Stack>
  );
}

interface ProfileRowProps {
  name: string;
  selected: boolean;
  onClick?: () => void;
}

function ProfileRow({ name, selected, onClick }: ProfileRowProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={selected}
      className={selected ? undefined : "hover-veil"}
      h={ROW_HEIGHT}
      px="sm"
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 8,
        backgroundColor: selected ? SELECTED_TINT : undefined,
      }}
    >
      <Text fz={14} fw={selected ? 600 : 500} c={selected ? "primary.6" : "text.7"} lineClamp={1}>
        {name}
      </Text>
    </UnstyledButton>
  );
}
