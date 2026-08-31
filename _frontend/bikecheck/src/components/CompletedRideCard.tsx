// The row the ride lists are built from — completed and pending rides are the same card
// with different content in its slots.
import type { ReactElement, ReactNode } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface CompletedRideCardProps {
  // The visual that identifies the row at a glance: a route map, a photo, an icon.
  leading?: ReactNode;
  // Leads the row, so it should be whatever names the occasion.
  title: ReactNode;
  // The date line under the title.
  subtitle?: ReactNode;
  // Metadata that belongs with the date rather than with the metrics — the bike, typically.
  meta?: ReactNode;
  // The row of icon-and-number readings along the bottom; use HistoryMetric for each.
  metrics?: ReactNode;
  // Off by default: the ride lists have never shown one and must stay as they are.
  chevron?: boolean;
  onOpen: () => void;
}

// Renders one ride row on the standard card surface — see docs/ui/card-surface.md.
export function CompletedRideCard({
  leading,
  title,
  subtitle,
  meta,
  metrics,
  chevron = false,
  onOpen,
}: CompletedRideCardProps): ReactElement {
  return (
    <UnstyledButton onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        radius="lg"
        p="sm"
        style={{
          // Keep the gradient when setting the card color.
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          border: "none",
          // Use a subtle shadow for stacked cards.
          boxShadow: "var(--elev-row)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        <Group gap="lg" wrap="nowrap" align="center">
          {leading}

          {/* minWidth lets the title clamp inside the flexible column. */}
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            {/* Keeps title, date and metadata visually grouped. */}
            <Stack gap={2}>
              <Text fw={600} fz={16} c="text.6" lineClamp={1}>
                {title}
              </Text>
              {subtitle !== undefined && (
                <Text fz={13} c="text.7">
                  {subtitle}
                </Text>
              )}
              {meta}
            </Stack>
            {metrics !== undefined && (
              <Group gap="lg" wrap="nowrap">
                {metrics}
              </Group>
            )}
          </Stack>

          {chevron && <ChevronRight size={18} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

// One icon-and-number reading in a card's metric row.
export function HistoryMetric({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      <Icon size={14} color="var(--color-text-dim)" />
      <Text fz={13} c="var(--color-text-dim)">
        {children}
      </Text>
    </Group>
  );
}
