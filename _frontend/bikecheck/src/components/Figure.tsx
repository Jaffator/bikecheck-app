// A desktop figure tile: an eyebrow, one value and a line of detail; pressable when it leads somewhere.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { Eyebrow } from "./Eyebrow";
import { PRESS_TRANSITION } from "./panelRows";

// The skeleton holds the value's line, so nothing jumps when it loads.
const VALUE_LINE = 28;

export interface FigureProps {
  title: string;
  // Null while it loads.
  value: ReactNode | null;
  valueFigure?: boolean;
  detail: ReactNode;
  // Numbers get tabular numerals so they line up; words do not.
  detailFigure?: boolean;
  // Without it the figure is only read, never pressed.
  onOpen?: () => void;
}

export function Figure({
  title,
  value,
  valueFigure = true,
  detail,
  detailFigure = false,
  onOpen,
}: FigureProps): ReactElement {
  const surface: CSSProperties = {
    borderRadius: "var(--mantine-radius-lg)",
    backgroundColor: "var(--mantine-color-cards-6)",
    boxShadow: "var(--elev-panel)",
  };
  const body = (
    <Stack gap={4}>
      <Eyebrow>{title}</Eyebrow>
      {value === null ? (
        <Skeleton h={VALUE_LINE} w="50%" radius="sm" />
      ) : (
        <Text
          className={valueFigure ? "tabular-nums" : undefined}
          fz={22}
          fw={600}
          lh={`${String(VALUE_LINE)}px`}
          lts="var(--tracking-title)"
          c="text.6"
          lineClamp={1}
        >
          {value}
        </Text>
      )}
      <Text className={detailFigure ? "tabular-nums" : undefined} fz={13} c="var(--color-text-dim)" lineClamp={1}>
        {detail}
      </Text>
    </Stack>
  );

  if (onOpen === undefined) {
    return (
      <Box p="md" style={surface}>
        {body}
      </Box>
    );
  }
  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil active:scale-[0.985]"
      p="md"
      style={{ ...surface, transition: PRESS_TRANSITION }}
    >
      {body}
    </UnstyledButton>
  );
}
