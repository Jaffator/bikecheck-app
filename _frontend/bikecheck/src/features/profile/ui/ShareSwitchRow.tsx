// One row of the share drawer: what goes out, and the switch that decides it. Disabled
// sinks into the sheet the way the theme's disabled Button does - not just dimmed.
import type { ReactElement, ReactNode } from "react";
import { Group, Stack, Switch, Text } from "@mantine/core";

const HAIRLINE = "1px solid var(--color-border-subtle)";

function switchStyles(checked: boolean, disabled: boolean): Record<string, React.CSSProperties> {
  if (disabled) {
    return {
      track: {
        backgroundColor: "var(--mantine-color-cards-7)",
        borderColor: "var(--mantine-color-inputs-5)",
        cursor: "not-allowed",
      },
      thumb: { backgroundColor: "var(--mantine-color-text-9)" },
    };
  }
  return {
    track: {
      backgroundColor: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
      borderColor: "var(--mantine-color-other-borderSolid)",
    },
    thumb: { backgroundColor: checked ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)" },
  };
}

interface ShareSwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  // Costs sit under the history switch they depend on.
  nested?: boolean;
  first?: boolean;
  leading?: ReactNode;
}

export function ShareSwitchRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
  nested = false,
  first = false,
  leading,
}: ShareSwitchRowProps): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap" py={10} pl={nested ? 20 : 0} style={{ borderTop: first ? "none" : HAIRLINE }}>
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        {leading}
        <Stack gap={1} style={{ minWidth: 0 }}>
          <Text fw={600} fz={15} c={disabled ? "text.9" : "text.6"} truncate>
            {label}
          </Text>
          {hint && (
            <Text fz={12} c={disabled ? "text.9" : "var(--color-text-dim)"}>
              {hint}
            </Text>
          )}
        </Stack>
      </Group>
      <Switch
        withThumbIndicator={false}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={label}
        styles={switchStyles(checked, disabled)}
      />
    </Group>
  );
}
