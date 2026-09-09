// What a derived reading means, over whatever raised it — a part's sheet or a Tracked
// Action's row. Reading only: it says what the number is and closes, so it wears the
// confirmation layer without its buttons.
import type { ReactElement } from "react";
import { Modal, Text } from "@mantine/core";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above the sheet or the page that raised it, below nothing else.
const EXPLANATION_Z_INDEX = 400;

export interface Explained {
  title: string;
  body: string;
}

interface ExplanationModalProps {
  // What is being explained right now, or null while nothing is.
  explained: Explained | null;
  onClose: () => void;
}

export function ExplanationModal({ explained, onClose }: ExplanationModalProps): ReactElement {
  // Android's back gesture dismisses this rather than whatever is under it.
  useOverlayBack(explained !== null, onClose);

  return (
    <Modal
      opened={explained !== null}
      onClose={onClose}
      title={explained?.title ?? ""}
      centered
      radius="md"
      zIndex={EXPLANATION_Z_INDEX}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
        {explained?.body}
      </Text>
    </Modal>
  );
}
