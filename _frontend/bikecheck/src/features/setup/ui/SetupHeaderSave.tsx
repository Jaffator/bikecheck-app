// Desktop's Save: in the page's header beside its title rather than pinned to the window's foot,
// and only while there is something to save.
import type { ReactElement } from "react";
import { Button, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface SetupHeaderSaveProps {
  // How many fields differ from the saved profile.
  changes: number;
  saving: boolean;
  saveFailed: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function SetupHeaderSave({ changes, saving, saveFailed, onDiscard, onSave }: SetupHeaderSaveProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap="sm" wrap="nowrap">
      {/* The failure belongs beside the button that failed. */}
      {saveFailed ? (
        <Text fz={13} c="red.5">
          {t("setup.saveFailed")}
        </Text>
      ) : (
        <Text fz={13} c="var(--color-text-dim)" className="tabular-nums">
          {t("setup.unsavedChanges", { count: changes })}
        </Text>
      )}
      <Button variant="outline" radius="md" size="sm" disabled={saving} onClick={onDiscard}>
        {t("setup.discard")}
      </Button>
      <Button color="primary.6" c="textDark.6" radius="md" size="sm" loading={saving} onClick={onSave}>
        {t("setup.save")}
      </Button>
    </Group>
  );
}
