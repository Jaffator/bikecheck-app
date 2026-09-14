// What an owner can do with Setup Profiles: begin another, and - once one is saved - rename
// it, copy it or delete it. Absent on an Archived Bike, which takes no changes at all.
import type { ReactElement } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Copy, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

const ICON_SIZE = 18;

interface SetupProfileMenuProps {
  onCreate: () => void;
  // False while the bike has no saved profile: there is nothing yet to rename, copy or delete.
  hasProfile: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SetupProfileMenu({
  onCreate,
  hasProfile,
  onRename,
  onDuplicate,
  onDelete,
}: SetupProfileMenuProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Menu position="bottom-end" radius="md" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="transparent"
          radius="xl"
          size="sm"
          aria-label={t("setup.profileMenu")}
          // The bar itself is transparent, so the burger carries its own disc to be read against.
          style={{ flexShrink: 0, marginInline: 2, backgroundColor: "var(--mantine-color-cards-6)" }}
        >
          <MoreVertical size={ICON_SIZE} color="var(--color-text-dim)" />
        </ActionIcon>
      </Menu.Target>

      {/* Wears the same surface as the part row menu, so the app has one dropdown. */}
      <Menu.Dropdown
        bg="cards.6"
        p={8}
        style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
      >
        <Menu.Item color="text" py={12} fw={600} leftSection={<Plus size={ICON_SIZE} />} onClick={onCreate}>
          {t("setup.newProfile")}
        </Menu.Item>

        {hasProfile && (
          <>
            <Menu.Item color="text" py={12} fw={600} leftSection={<Pencil size={ICON_SIZE} />} onClick={onRename}>
              {t("setup.rename")}
            </Menu.Item>

            {/* The one affordance ADR 0029 kept from history: a profile may start as a copy. */}
            <Menu.Item color="text" py={12} fw={600} leftSection={<Copy size={ICON_SIZE} />} onClick={onDuplicate}>
              {t("setup.duplicate")}
            </Menu.Item>

            <Menu.Item color="red.5" py={12} fw={600} leftSection={<Trash2 size={ICON_SIZE} />} onClick={onDelete}>
              {t("setup.delete")}
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
