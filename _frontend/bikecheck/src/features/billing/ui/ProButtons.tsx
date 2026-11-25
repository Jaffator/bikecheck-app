import type { CSSProperties, ReactElement } from "react";
import { Button } from "@mantine/core";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";

// Readable while disabled: checking a key is said on the button itself.
const DISABLED_PRIMARY = {
  ...disabledButtonStyles.root,
  "--mantine-color-disabled": "var(--color-surface-raised)",
  "--mantine-color-disabled-color": "var(--color-muted)",
  opacity: 1,
} as CSSProperties;

const DISABLED_QUIET = { ...disabledButtonStyles.root, "--mantine-color-disabled": "transparent" } as CSSProperties;

interface ProButtonProps {
  label: string;
  disabled?: boolean;
  // Left out, the button submits the sheet's form.
  onClick?: () => void;
}

export function ProPrimaryButton({ label, disabled = false, onClick }: ProButtonProps): ReactElement {
  return (
    <Button
      type={onClick === undefined ? "submit" : "button"}
      fullWidth
      color="primary.6"
      c={disabled ? undefined : "textDark.6"}
      radius={12}
      h={{ base: 52, md: 48 }}
      fz={{ base: 16, md: 15 }}
      fw={600}
      styles={{ root: DISABLED_PRIMARY }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function ProQuietButton({ label, disabled = false, onClick }: ProButtonProps): ReactElement {
  return (
    <Button
      variant="subtle"
      fullWidth
      c="var(--color-text-dim)"
      radius={12}
      mt={4}
      h={{ base: 48, md: 44 }}
      fz={15}
      fw={500}
      styles={{ root: DISABLED_QUIET }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
