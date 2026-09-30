// The bike's rarely-run acts behind one `⋯`: correcting it, detaching it, throwing it away.
import type { CSSProperties, ReactElement } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Archive, MoreVertical, Pencil, Unlink } from "lucide-react";
import { IoLogoWebComponent } from "react-icons/io5";

interface BikeActionsMenuProps {
  // Absent on desktop, where Edit is a button of its own beside the menu.
  onEdit?: () => void;
  // Absent on an unpaired bike, which has nothing to detach.
  onUnpair?: () => void;
  // Absent until the owner has named a part of their own (ADR 0021).
  onManageParts?: () => void;
  onArchive: () => void;
  targetStyle?: CSSProperties;
}

export function BikeActionsMenu({
  onEdit,
  onUnpair,
  onManageParts,
  onArchive,
  targetStyle,
}: BikeActionsMenuProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Menu position="bottom-end" radius="md" withinPortal>
      <Menu.Target>
        <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("bikes.cardMenu")} style={targetStyle}>
          <MoreVertical size={22} color="var(--mantine-color-text-6)" />
        </ActionIcon>
      </Menu.Target>

      {/* Wears the same surface as the Reports menu, so the app has one dropdown. */}
      <Menu.Dropdown
        bg="cards.6"
        p={8}
        style={{
          border: "1px solid var(--mantine-color-cards-6)",
          boxShadow: "var(--elev-panel)",
        }}
      >
        {onEdit !== undefined && (
          <Menu.Item color="text" py={12} fw={600} leftSection={<Pencil size={18} />} onClick={onEdit}>
            {t("bikes.edit")}
          </Menu.Item>
        )}

        {onUnpair !== undefined && (
          <Menu.Item color="text" py={12} fw={600} leftSection={<Unlink size={18} />} onClick={onUnpair}>
            {t("strava.unpairBike")}
          </Menu.Item>
        )}

        {/* The custom types are the owner's, not this bike's: removing one here takes it
            out of the picker on every bike. */}
        {onManageParts !== undefined && (
          <Menu.Item
            color="text"
            py={12}
            fw={600}
            leftSection={<IoLogoWebComponent size={18} />}
            onClick={onManageParts}
          >
            {t("customParts.title")}
          </Menu.Item>
        )}

        {/* Archiving is the only way out of the garage; destroying the bike is offered
            in the archive alone, never one tap from this page (ADR 0024). */}
        <Menu.Item color="red.5" py={12} fw={600} leftSection={<Archive size={18} />} onClick={onArchive}>
          {t("bikes.archive")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
