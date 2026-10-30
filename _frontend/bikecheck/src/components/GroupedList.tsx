// A titled card of hairline-divided rows, and the row it is made of - the add-service mocks F and G.
import { Children, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { Eyebrow } from "./Eyebrow";
import { LIST_ROW_HEIGHT } from "./groupedListStyles";
import { PANEL_HAIRLINE } from "./panelRows";

const CARD_STYLE: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "none",
  boxShadow: "var(--elev-panel)",
};

const ROW_STYLE: CSSProperties = { minHeight: LIST_ROW_HEIGHT, width: "100%" };

interface GroupedListProps {
  title: string;
  children: ReactNode;
}

export function GroupedList({ title, children }: GroupedListProps): ReactElement {
  // A wrapper per row draws the hairline, so a row never needs to know whether it is first.
  const rows = Children.toArray(children);

  return (
    <Stack gap={8}>
      <Box px={4}>
        <Eyebrow>{title}</Eyebrow>
      </Box>
      <Paper radius="lg" px="md" style={CARD_STYLE}>
        {rows.map((row, index) => (
          <Box
            key={isValidElement(row) && row.key !== null ? row.key : index}
            style={index > 0 ? { borderTop: PANEL_HAIRLINE } : undefined}
          >
            {row}
          </Box>
        ))}
      </Paper>
    </Stack>
  );
}

interface ListRowProps {
  label: ReactNode;
  // Ties the label to the row's field, so a tap on the label focuses it.
  labelFor?: string;
  // Makes the whole row one button, with a chevron.
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function ListRow({ label, labelFor, onClick, disabled, children }: ListRowProps): ReactElement {
  const trailing = (
    <Group gap={6} wrap="nowrap" justify="flex-end" style={{ flex: 1, minWidth: 0 }}>
      {children}
      {onClick !== undefined && (
        <ChevronRight size={16} color="var(--mantine-color-text-8)" style={{ flexShrink: 0 }} />
      )}
    </Group>
  );

  if (onClick === undefined) {
    return (
      <Group gap="md" wrap="nowrap" style={ROW_STYLE}>
        <Text component="label" htmlFor={labelFor} fz={14} c="text.6" style={{ flexShrink: 0 }}>
          {label}
        </Text>
        {trailing}
      </Group>
    );
  }

  return (
    <UnstyledButton
      onClick={onClick}
      disabled={disabled}
      style={{ ...ROW_STYLE, display: "flex", alignItems: "center", gap: 16, opacity: disabled === true ? 0.5 : 1 }}
    >
      <Text component="span" fz={14} c="text.6" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      {trailing}
    </UnstyledButton>
  );
}
