// Desktop's profile switcher: every Setup Profile as a tab over the sheet, the profile menu on the
// right. A bike with no saved profile shows the unsaved default as its single tab (ADR 0029).
import type { ReactElement, ReactNode } from "react";
import { Group, Tabs, Text, UnstyledButton } from "@mantine/core";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SetupProfile } from "../setup.types";

// The tab the unsaved default stands on; never a profile id.
const DEFAULT_TAB = "default";

interface SetupProfileTabsProps {
  profiles: SetupProfile[];
  // Null while the bike has no saved profile: the default tab stands in, already selected.
  selectedId: number | null;
  onSelect: (id: number) => void;
  // Left out on an Archived Bike, which takes no new profile.
  onCreate?: () => void;
  // Who the numbers were set for and when, beside the menu.
  meta: string | null;
  menu: ReactNode;
}

export function SetupProfileTabs({
  profiles,
  selectedId,
  onSelect,
  onCreate,
  meta,
  menu,
}: SetupProfileTabsProps): ReactElement {
  const { t } = useTranslation();
  const value = selectedId === null ? DEFAULT_TAB : String(selectedId);

  return (
    <Tabs
      value={value}
      onChange={(next) => {
        if (next !== null && next !== DEFAULT_TAB) onSelect(Number(next));
      }}
      color="primary.6"
      styles={{
        root: { "--tab-border-color": "var(--color-border-subtle)" },
        tab: { borderBottomWidth: 2, "--tab-hover-color": "transparent" },
      }}
    >
      <Tabs.List aria-label={t("setup.profiles")} style={{ alignItems: "center" }}>
        {profiles.length === 0 && (
          <Tabs.Tab value={DEFAULT_TAB} c="text.6" fw={600}>
            {t("setup.defaultProfileName")}
          </Tabs.Tab>
        )}
        {profiles.map((profile) => {
          const selected = String(profile.id) === value;
          return (
            <Tabs.Tab key={profile.id} value={String(profile.id)} c={selected ? "text.6" : "text.8"} fw={selected ? 600 : 500}>
              {profile.name}
            </Tabs.Tab>
          );
        })}
        {onCreate && (
          <UnstyledButton onClick={onCreate} px="sm" className="hover-veil" style={{ borderRadius: 8 }}>
            <Group gap={4} wrap="nowrap" c="var(--color-text-dim)">
              <Plus size={14} />
              <Text fz={14} fw={500} c="inherit">
                {t("setup.newProfile")}
              </Text>
            </Group>
          </UnstyledButton>
        )}
        <Group gap="xs" wrap="nowrap" ml="auto" pl="md">
          {meta !== null && (
            <Text fz={12} c="var(--color-text-dim)" className="tabular-nums" lineClamp={1}>
              {meta}
            </Text>
          )}
          {menu}
        </Group>
      </Tabs.List>
    </Tabs>
  );
}
