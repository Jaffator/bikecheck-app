// What an owner can do to the Setup Profile being read: rename it, begin another as a copy
// of it, or delete it. Absent on an Archived Bike and while the bike has no saved profile.
import type { ReactElement } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";

const ICON_SIZE = 18;

interface SetupProfileMenuProps {
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SetupProfileMenu({ onRename, onDuplicate, onDelete }: SetupProfileMenuProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Menu position="bottom-end" radius="md" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="transparent"
          radius="xl"
          size="md"
          aria-label={t("setup.profileMenu")}
          style={{ flexShrink: 0 }}
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
      </Menu.Dropdown>
    </Menu>
  );
}
