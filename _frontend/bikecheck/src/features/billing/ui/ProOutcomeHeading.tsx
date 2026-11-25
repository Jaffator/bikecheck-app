// A heading that says how it stands: a check or a cross before it, the amount after it.
import type { ReactElement, RefObject } from "react";
import { Group, Text } from "@mantine/core";
import { ProTitle } from "./ProTitle";

const TYPE = { fz: 28, lh: "36px", fw: 700, lts: "var(--tracking-display)" } as const;

interface ProOutcomeHeadingProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  outcome?: "done" | "failed";
  amount?: string;
}

export function ProOutcomeHeading({ headingRef, title, outcome, amount }: ProOutcomeHeadingProps): ReactElement {
  return (
    <Group gap={12} wrap="nowrap">
      {outcome !== undefined && <OutcomeMark outcome={outcome} />}
      <ProTitle headingRef={headingRef} c={outcome === "failed" ? "red.5" : "text.6"} {...TYPE}>
        {title}
      </ProTitle>
      {amount !== undefined && (
        <Text className="tabular-nums" ml="auto" c="text.6" style={{ whiteSpace: "nowrap" }} {...TYPE}>
          {amount}
        </Text>
      )}
    </Group>
  );
}

const MARKS = {
  done: { color: "primary-6", strokes: ["M20 33 28.5 41.5 45 24"] },
  failed: { color: "red-5", strokes: ["M22 22 42 42", "M42 22 22 42"] },
} as const;

function OutcomeMark({ outcome }: { outcome: "done" | "failed" }): ReactElement {
  const { color, strokes } = MARKS[outcome];

  return (
    <svg width={36} height={36} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0 }}>
      <circle className="pro-check__disc" cx={32} cy={32} r={32} fill={`var(--mantine-color-${color})`} />
      {strokes.map((d) => (
        <path
          key={d}
          className="pro-check__tick"
          pathLength={1}
          d={d}
          fill="none"
          stroke="var(--mantine-color-textDark-6)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
