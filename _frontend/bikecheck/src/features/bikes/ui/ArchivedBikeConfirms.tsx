// Putting an archived bike back and destroying it for good, asked the same way from the drawer and the desktop table (ADR 0024).
import { useState, type ReactElement } from "react";
import { Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { fieldLabel, inputStyles } from "@/features/add_bike_page/formStyles";
import { useDeleteBikePermanently, useUnarchiveBike } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";

// The wizard's field, with the label dimmed to sit quietly above the typed-back name.
const confirmInputStyles = {
  ...inputStyles,
  label: { ...fieldLabel, color: "var(--mantine-color-cards-4)" },
};

interface ArchivedBikeConfirmsProps {
  restoring: Bike | null;
  onRestoreClose: () => void;
  destroying: Bike | null;
  onDestroyClose: () => void;
}

export function ArchivedBikeConfirms({
  restoring,
  onRestoreClose,
  destroying,
  onDestroyClose,
}: ArchivedBikeConfirmsProps): ReactElement {
  const { t } = useTranslation();
  const unarchive = useUnarchiveBike();
  const destroy = useDeleteBikePermanently();
  const [typedName, setTypedName] = useState("");

  // Cleared on the way out, so a name typed for one bike never confirms another.
  function closeDestroy(): void {
    setTypedName("");
    destroy.reset();
    onDestroyClose();
  }

  function closeRestore(): void {
    unarchive.reset();
    onRestoreClose();
  }

  // The name has to match exactly, so a glance at the wrong row cannot destroy a bike.
  const nameMatches = destroying !== null && typedName === bikeTitle(destroying);

  return (
    <>
      {/* Putting a bike back costs nothing but says what does not come back with it. */}
      <ConfirmModal
        opened={restoring !== null}
        onCancel={closeRestore}
        onConfirm={() => {
          if (restoring === null) return;
          unarchive.mutate(restoring.id, { onSuccess: closeRestore });
        }}
        title={t("archive.unarchiveConfirmTitle", { name: restoring === null ? "" : bikeTitle(restoring) })}
        body={t("archive.unarchiveConfirmBody")}
        cancelLabel={t("archive.cancel")}
        confirmLabel={t("archive.unarchive")}
        pending={unarchive.isPending}
      >
        {unarchive.isError && <FailedLine />}
      </ConfirmModal>

      {/* The irreversible one. The name is typed back here and never sent - the server
          already knows it; this guard is for the hand, not for the wire. */}
      <ConfirmModal
        opened={destroying !== null}
        onCancel={closeDestroy}
        onConfirm={() => {
          if (destroying === null || !nameMatches) return;
          destroy.mutate(destroying.id, { onSuccess: closeDestroy });
        }}
        title={t("archive.deleteConfirmTitle", { name: destroying === null ? "" : bikeTitle(destroying) })}
        body={t("archive.deleteConfirmBody")}
        cancelLabel={t("archive.cancel")}
        confirmLabel={t("archive.deleteForever")}
        pending={destroy.isPending}
        confirmDisabled={!nameMatches}
      >
        <TextInput
          value={typedName}
          onChange={(event) => setTypedName(event.currentTarget.value)}
          placeholder={destroying === null ? "" : bikeTitle(destroying)}
          label={t("archive.deleteConfirmTypeName")}
          styles={confirmInputStyles}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {destroy.isError && <FailedLine />}
      </ConfirmModal>
    </>
  );
}

function FailedLine(): ReactElement {
  const { t } = useTranslation();
  return (
    <Text fz={13} c="red.5">
      {t("archive.actionFailed")}
    </Text>
  );
}
