import type { CSSProperties, ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import bikeImage from "@/assets/images/login_bike.webp";

export const STRAVA = "var(--mantine-color-strava-6)";

interface BikeProps {
  left: number;
  top: number;
  width: number;
}

// The same bike throughout: only its crop changes from slide to slide.
export function WelcomeBike({ left, top, width }: BikeProps): ReactElement {
  return (
    <img
      src={bikeImage}
      alt=""
      style={{ position: "absolute", left, top, width, maxWidth: "none", height: "auto" }}
    />
  );
}

interface TargetDotProps {
  x: number;
  y: number;
  color: string;
  ringOpacity: number;
}

// Where a callout's line lands on the bike. Sits inside the graphic's svg.
export function TargetDot({ x, y, color, ringOpacity }: TargetDotProps): ReactElement {
  return (
    <>
      <circle cx={x} cy={y} r="4" fill={color} />
      <circle cx={x} cy={y} r="9" stroke={color} strokeOpacity={ringOpacity} />
    </>
  );
}

interface WearChipProps {
  label: string;
  value: string;
  position: CSSProperties;
}

export function WearChip({ label, value, position }: WearChipProps): ReactElement {
  return (
    <Box
      pos="absolute"
      h={28}
      px={10}
      bg="cards.6"
      fz={12}
      fw={600}
      style={{
        ...position,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        borderRadius: 9999,
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Box c="text.6">{label}</Box>
      <Box c={STRAVA} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Box>
    </Box>
  );
}

interface CalloutProps {
  value: string;
  label: string;
  position: CSSProperties;
}

export function Callout({ value, label, position }: CalloutProps): ReactElement {
  return (
    <Box
      pos="absolute"
      py={8}
      px={10}
      bg="cards.6"
      style={{ ...position, boxSizing: "border-box", borderRadius: 12, boxShadow: "var(--elev-panel)" }}
    >
      <Text fz={17} lh="22px" fw={600} c="text.6" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {value}
      </Text>
      <Text fz={12} lh="16px" c="var(--color-muted)">
        {label}
      </Text>
    </Box>
  );
}

interface SampleSwitchProps {
  options: [string, string, string];
  active: number;
}

// A picture of the app's segmented control, so it has none of its behaviour.
export function SampleSwitch({ options, active }: SampleSwitchProps): ReactElement {
  return (
    <Box
      p={4}
      fz={14}
      fw={600}
      c="var(--color-text-dim)"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        borderRadius: 16,
        backgroundColor: "var(--color-surface-well)",
      }}
    >
      {options.map((option, index) => (
        <Box
          key={option}
          h={28}
          bg={index === active ? "cards.5" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: index === active ? 12 : 0,
            borderLeft:
              index > 0 && index - 1 !== active && index !== active ? "1px solid var(--color-border-strong)" : undefined,
          }}
        >
          {option}
        </Box>
      ))}
    </Box>
  );
}
