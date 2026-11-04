// A figure as one section of a figures card: an eyebrow, a value with its unit apart, a share chip with
// its words, and a graphic beside them on the right; pressable when it does something.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { Eyebrow } from "./Eyebrow";
import { PRESS_TRANSITION } from "./panelRows";
import { Pill } from "./Pill";

// The skeleton holds the value's line, so nothing jumps when it loads.
const VALUE_LINE = 32;
// The chip's height, held even without one, so the words sit at the same place in every section.
const CHIP_HEIGHT = 22;
// The graphic's slot beside the value and the chip. The words give way to it and truncate; under this
// much room for the value it is the slot that narrows, down to the ring's width.
const GRAPHIC_WIDTH = 100;
const GRAPHIC_MIN_WIDTH = 56;
const VALUE_MIN_WIDTH = 112;
const GRAPHIC_SLOT = `clamp(${String(GRAPHIC_MIN_WIDTH)}px, calc(100% - ${String(VALUE_MIN_WIDTH + 12)}px), ${String(GRAPHIC_WIDTH)}px)`;
export const GRAPHIC_HEIGHT = 56;

export interface FigureSectionProps {
  title: string;
  // Null while it loads.
  value: string | null;
  unit: string;
  // The share, as a pill; none when there is nothing to set the figure against.
  chip?: string;
  detail?: ReactNode;
  // Numbers get tabular numerals so they line up; words do not.
  detailFigure?: boolean;
  graphic?: ReactNode;
  onOpen?: () => void;
}

export function FigureSection({
  title,
  value,
  unit,
  chip,
  detail,
  detailFigure = false,
  graphic,
  onOpen,
}: FigureSectionProps): ReactElement {
  const body = (
    <Stack gap={6}>
      <Eyebrow>{title}</Eyebrow>
      <Group gap={12} wrap="nowrap" align="center">
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          {value === null ? (
            <Skeleton h={VALUE_LINE} w="50%" radius="sm" />
          ) : (
            <Group gap={6} align="baseline" wrap="nowrap">
              <Text
                className="tabular-nums"
                fz={28}
                fw={700}
                lh={`${String(VALUE_LINE)}px`}
                lts="var(--tracking-display)"
                c="text.6"
                truncate
              >
                {value}
              </Text>
              <Text fz={14} fw={600} c="var(--color-text-dim)">
                {unit}
              </Text>
            </Group>
          )}
          <Group gap={8} wrap="nowrap" mih={CHIP_HEIGHT}>
            {chip !== undefined && <Pill>{chip}</Pill>}
            <Text
              className={detailFigure ? "tabular-nums" : undefined}
              fz={12}
              c="var(--color-text-dim)"
              truncate
              style={{ minWidth: 0 }}
            >
              {detail}
            </Text>
          </Group>
        </Stack>
        {graphic !== undefined && (
          <Box w={GRAPHIC_SLOT} style={{ flexShrink: 0 }}>
            {graphic}
          </Box>
        )}
      </Group>
    </Stack>
  );

  if (onOpen === undefined) {
    return (
      <Box p="md" h="100%">
        {body}
      </Box>
    );
  }
  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil"
      p="md"
      h="100%"
      w="100%"
      style={{ display: "block", transition: PRESS_TRANSITION }}
    >
      {body}
    </UnstyledButton>
  );
}
