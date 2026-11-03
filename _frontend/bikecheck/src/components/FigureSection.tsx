// A figure as one section of a figures card: an icon and eyebrow, a value with its unit apart, a share
// chip with its words, and a graphic along the bottom; pressable when it does something.
import type { ReactElement, ReactNode } from "react";
import { Box, Center, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { Eyebrow } from "./Eyebrow";
import { PRESS_TRANSITION } from "./panelRows";
import { Pill } from "./Pill";

// The skeleton holds the value's line, so nothing jumps when it loads.
const VALUE_LINE = 32;
const ICON_BOX = 26;
// The chip's height, held even without one, so the graphic sits at the same place in every section.
const CHIP_HEIGHT = 22;
// Every section keeps the slot, so the four bottoms sit level whether or not one draws anything.
export const GRAPHIC_HEIGHT = 56;

export interface FigureSectionProps {
  // Drawn at 15 px in the accent, in a raised square.
  icon: ReactNode;
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
  icon,
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
    <Stack gap={6} h="100%">
      <Group gap={8} wrap="nowrap">
        <Center
          w={ICON_BOX}
          h={ICON_BOX}
          c="primary.6"
          style={{ flexShrink: 0, borderRadius: 8, backgroundColor: "var(--color-surface-raised)" }}
        >
          {icon}
        </Center>
        <Eyebrow>{title}</Eyebrow>
      </Group>
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
      <Box mt="auto" h={GRAPHIC_HEIGHT} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {graphic}
      </Box>
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
