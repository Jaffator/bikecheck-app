// The dialog shown before something is thrown away — deleting a bike, deleting a service,
// discarding wizard work. Every caller passes its own copy; the surface, the dim body and
// the cancel/confirm pair are decided once here so a fourth caller cannot drift.
import type { ReactElement } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { tapFeedback } from "@/utils/haptics";

interface ConfirmModalProps {
  opened: boolean;
  // Runs when the user backs out: the cancel button, the close control or the overlay.
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  cancelLabel: string;
  // The destructive one. Not always a delete — the wizard discards work with it.
  confirmLabel: string;
  // While the confirmed work runs, the confirm button spins and cancel is refused.
  pending?: boolean;
}

// Renders one confirmation dialog on the standard modal surface.
export function ConfirmModal({
  opened,
  onCancel,
  onConfirm,
  title,
  body,
  cancelLabel,
  confirmLabel,
  pending = false,
}: ConfirmModalProps): ReactElement {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      radius="md"
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {body}
        </Text>

        <Group gap="sm" grow>
          <Button variant="default" radius="md" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            color="red.5"
            radius="md"
            loading={pending}
            onClick={() => {
              void tapFeedback();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
