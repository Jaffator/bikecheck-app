// A pill in a status row. A quiet one tells a state; a bordered one is a control.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Group, UnstyledButton } from "@mantine/core";
import { PRESS_TRANSITION } from "./panelRows";

const CHIP_HEIGHT = 38;

const TONE: Record<"quiet" | "control", CSSProperties> = {
  quiet: { border: "1px solid var(--color-border-subtle)" },
  control: {
    border: "1px solid var(--mantine-color-cards-5)",
    boxShadow: "0 1px 0 rgba(255, 255, 255, 0.04) inset",
  },
};

interface StatusChipProps {
  tone: "quiet" | "control";
  label: string;
  onClick: () => void;
  // Set for a chip that opens a menu or sheet of choices.
  hasPopup?: boolean;
  // The one chip in a row that gives way when the row runs out of width; its text truncates.
  shrink?: boolean;
  children: ReactNode;
}

export function StatusChip({
  tone,
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
        ...TONE[tone],
        borderRadius: 999,
        backgroundColor: "var(--mantine-color-cards-6)",
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
