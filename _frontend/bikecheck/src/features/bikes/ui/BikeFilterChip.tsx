// A desktop filter chip: every bike or one, in its colour. Rides and Service share it.
import type { ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { BikeColorDot } from "./BikeColorDot";

interface BikeFilterChipProps {
  label: string;
  colorIndex?: number;
  active: boolean;
  onClick: () => void;
}

// Single choice, so the chosen chip wears the accent and the rest stay quiet.
export function BikeFilterChip({ label, colorIndex, active, onClick }: BikeFilterChipProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={active}
      className="hover-veil"
      h={30}
      px={12}
      fz={12}
      fw={active ? 700 : 600}
      c={active ? "primary.6" : "text.6"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 9999,
        whiteSpace: "nowrap",
        border: `1px solid ${active ? "var(--mantine-color-primary-6)" : "var(--color-border-subtle)"}`,
        backgroundColor: active ? "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)" : undefined,
      }}
    >
      {colorIndex !== undefined && <BikeColorDot colorIndex={colorIndex} size={7} />}
      {label}
    </UnstyledButton>
  );
}
