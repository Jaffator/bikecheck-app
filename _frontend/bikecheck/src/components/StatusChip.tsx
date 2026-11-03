// A pill in a status row, drawn as a card: same surface and shadow, no border.
import type { ReactElement, ReactNode } from "react";
import { Group, UnstyledButton } from "@mantine/core";
import { PRESS_TRANSITION } from "./panelRows";

const CHIP_HEIGHT = 38;

interface StatusChipProps {
  label: string;
  onClick: () => void;
  // Set for a chip that opens a menu or sheet of choices.
  hasPopup?: boolean;
  // The one chip in a row that gives way when the row runs out of width; its text truncates.
  shrink?: boolean;
  children: ReactNode;
}

export function StatusChip({
  label,
  onClick,
  hasPopup = false,
  shrink = false,
  children,
}: StatusChipProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-label={label}
      aria-haspopup={hasPopup ? "dialog" : undefined}
      className="hover-veil active:scale-[0.97]"
      h={CHIP_HEIGHT}
      px={12}
      fz={13}
      fw={600}
      c="text.6"
      style={{
        borderRadius: 999,
        backgroundColor: "var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-panel)",
        flexShrink: shrink ? 1 : 0,
        minWidth: shrink ? 0 : undefined,
        transition: PRESS_TRANSITION,
      }}
    >
      <Group gap={8} wrap="nowrap" h="100%" style={{ minWidth: 0 }}>
        {children}
      </Group>
    </UnstyledButton>
  );
}
