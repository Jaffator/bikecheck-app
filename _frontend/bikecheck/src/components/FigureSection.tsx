// A figure as one section of a figures card: an eyebrow, a value with its unit apart, a share chip with
// its words, and a graphic beside them on the right; pressable when it does something.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { HOME_FIGURE_SIZE } from "@/features/stats/ui/HomeCardHeader";
import { useIsDesktop } from "@/layout/breakpoints";
import { Eyebrow } from "./Eyebrow";
import { PRESS_TRANSITION } from "./panelRows";
import { Pill } from "./Pill";

// The value's size and its line, which the skeleton holds so nothing jumps when it loads. The phone's is
// the figure the other Home cards use, so the stacked sections stay short; desktop has room for a display size.
const DESKTOP_VALUE = { fz: 28, fw: 700, line: 32, padding: 16, gap: 6 };
const PHONE_VALUE = { fz: HOME_FIGURE_SIZE, fw: 600, line: 26, padding: 12, gap: 4 };
// The chip's height, held even without one, so the words sit at the same place in every section.
const CHIP_HEIGHT = 22;
// The graphic's slot beside the value and the chip. The words give way to it and truncate; under this
// much room for the value it is the slot that narrows, down to the ring's width.
const GRAPHIC_WIDTH = 116;
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
  // The eyebrow and the chip's line run the section's full width, for words too long to share it with the graphic.
  spread?: boolean;
  // Beside the chip when spread, where the detail stays under the value.
  against?: string;
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
  spread = false,
  against,
  onOpen,
}: FigureSectionProps): ReactElement {
  const size = useIsDesktop() ? DESKTOP_VALUE : PHONE_VALUE;
  const eyebrow = <Eyebrow color="text.8">{title}</Eyebrow>;
  const valueLine =
    value === null ? (
      <Skeleton h={size.line} w="50%" radius="sm" />
    ) : (
      <Group gap={6} align="baseline" wrap="nowrap">
        <Text
          className="tabular-nums"
          fz={size.fz}
          fw={size.fw}
          lh={`${String(size.line)}px`}
          lts="var(--tracking-display)"
          c="text.6"
          truncate
        >
          {value}
        </Text>
        <Text fz={14} fw={600} c="text.8">
          {unit}
        </Text>
      </Group>
    );
  const detailLine = <FigureWords figure={detailFigure}>{detail}</FigureWords>;
  const chipLine = (words: ReactNode): ReactElement => (
    <Group gap={8} wrap="nowrap" mih={CHIP_HEIGHT}>
      {chip !== undefined && <Pill>{chip}</Pill>}
      {words}
    </Group>
  );
  const graphicSlot = graphic !== undefined && (
    <Box w={GRAPHIC_SLOT} style={{ flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
      {graphic}
    </Box>
  );
  const body = spread ? (
    <Stack gap={size.gap}>
      {eyebrow}
      <Group gap={12} wrap="nowrap" align="center">
        <Stack gap={size.gap} style={{ flex: 1, minWidth: 0 }}>
          {valueLine}
          {detailLine}
        </Stack>
        {graphicSlot}
      </Group>
      {chipLine(<FigureWords>{against}</FigureWords>)}
    </Stack>
  ) : (
    // The graphic's slot runs the section's full height: a graphic sits on the bottom, level with the words
    // under the value, or fills the height and lays itself out.
    <Group gap={12} wrap="nowrap" align="stretch">
      <Stack gap={size.gap} style={{ flex: 1, minWidth: 0 }}>
        {eyebrow}
        <Stack gap={size.gap}>
          {valueLine}
          {chipLine(detailLine)}
        </Stack>
      </Stack>
      {graphicSlot}
    </Group>
  );

  if (onOpen === undefined) {
    return (
      <Box p={size.padding} h="100%">
        {body}
      </Box>
    );
  }
  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil"
      p={size.padding}
      h="100%"
      w="100%"
      style={{ display: "block", transition: PRESS_TRANSITION }}
    >
      {body}
    </UnstyledButton>
  );
}

function FigureWords({ children, figure = false }: { children: ReactNode; figure?: boolean }): ReactElement {
  return (
    <Text
      className={figure ? "tabular-nums" : undefined}
      fz={12}
      // A step under the eyebrow, so only the value is bright.
      c="text.8"
      truncate
      style={{ minWidth: 0 }}
    >
      {children}
    </Text>
  );
}
