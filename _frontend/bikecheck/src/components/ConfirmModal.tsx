// The dialog shown before something is thrown away — deleting a bike, deleting a service,
// discarding wizard work. Every caller passes its own copy; the surface, the dim body and
// the cancel/confirm pair are decided once here so a fourth caller cannot drift.
import type { ReactElement, ReactNode } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above every sheet it can be opened from, so the dialog is never left behind an overlay.
const CONFIRM_Z_INDEX = 400;

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
  // Holds the destructive button inert until the question in `children` is answered - the
  // permanent deletion of a bike asks for its name to be typed first (ADR 0024).
  confirmDisabled?: boolean;
  // What the question still needs answering before it can be confirmed — a dismount asks
  // for the day the part came off. Sits between the body and the buttons.
  children?: ReactNode;
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
  confirmDisabled = false,
  children,
}: ConfirmModalProps): ReactElement {
  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onCancel);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      radius="md"
      zIndex={CONFIRM_Z_INDEX}
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

        {children}

        <Group gap="sm" grow>
          <Button variant="default" radius="md" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            color="red.5"
            radius="md"
            loading={pending}
            disabled={confirmDisabled}
            onClick={() => {
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
