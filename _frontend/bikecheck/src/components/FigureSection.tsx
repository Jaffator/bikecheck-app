// A figure as one section of a figures card: an eyebrow, one value, and a detail line with a
// small graphic at its end; pressable when it does something.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { Eyebrow } from "./Eyebrow";
import { PRESS_TRANSITION } from "./panelRows";

// The skeleton holds the value's line, so nothing jumps when it loads.
const VALUE_LINE = 28;
// As tall as the tallest graphic, so the sections' detail lines sit level.
const DETAIL_LINE = 24;

export interface FigureSectionProps {
  title: string;
  // Null while it loads.
  value: ReactNode | null;
  chip?: ReactNode;
  detail?: ReactNode;
  // Numbers get tabular numerals so they line up; words do not.
  detailFigure?: boolean;
  graphic?: ReactNode;
  onOpen?: () => void;
}

export function FigureSection({
  title,
  value,
  chip,
  detail,
  detailFigure = false,
  graphic,
  onOpen,
}: FigureSectionProps): ReactElement {
  const body = (
    <Stack gap={5}>
      <Eyebrow>{title}</Eyebrow>
      {value === null ? (
        <Skeleton h={VALUE_LINE} w="50%" radius="sm" />
      ) : (
        <Text
          className="tabular-nums"
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
      <Group gap={8} wrap="nowrap" justify="space-between" mih={DETAIL_LINE}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          {chip}
          <Text
            className={detailFigure ? "tabular-nums" : undefined}
            // A step under the phone tile's 13, as it shares the line with a chip and a graphic.
            fz={12}
            c="var(--color-text-dim)"
            truncate
            style={{ minWidth: 0 }}
          >
            {detail}
          </Text>
        </Group>
        {graphic}
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
