// A desktop dashboard card holding a table, on the standard surface: glow, --elev-panel, radius lg.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "./Eyebrow";
import { PANEL_HAIRLINE } from "./panelRows";

interface PanelProps {
  title: string;
  count?: number;
  link?: { label: string; onClick: () => void };
  children: ReactNode;
}

export function Panel({ title, count, link, children }: PanelProps): ReactElement {
  return (
    <Paper
      radius="lg"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Group justify="space-between" wrap="nowrap" px="md" pt="md" pb="sm">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fz={16} fw={600} c="text.6" lineClamp={1}>
            {title}
          </Text>
          {count !== undefined && (
            <Text className="font-mono" fz={13} c="var(--color-text-dim)">
              {count}
            </Text>
          )}
        </Group>
        {link && (
          <UnstyledButton
            onClick={link.onClick}
            className="hover-veil"
            px={8}
            py={4}
            style={{ borderRadius: "var(--mantine-radius-sm)", flexShrink: 0 }}
          >
            <Group gap={6} wrap="nowrap">
              <Eyebrow>{link.label}</Eyebrow>
              <ArrowRight size={12} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>
        )}
      </Group>
      {children}
    </Paper>
  );
}

export function PanelTableHead({
  columns,
  cells,
  rightAligned = [],
}: {
  columns: string;
  cells: string[];
  rightAligned?: number[];
}): ReactElement {
  return (
    <Box style={{ display: "grid", gridTemplateColumns: columns, gap: 16, padding: "0 16px 8px" }}>
      {cells.map((cell, index) => (
        <Eyebrow key={`${cell}-${String(index)}`} align={rightAligned.includes(index) ? "right" : undefined}>
          {cell}
        </Eyebrow>
      ))}
    </Box>
  );
}

export function PanelSkeletonRows({ count }: { count: number }): ReactElement {
  return (
    <Stack gap="sm" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} h={28} radius="sm" />
      ))}
    </Stack>
  );
}
