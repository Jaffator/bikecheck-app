// The eyebrow role of docs/ui/card-surface.md.
import type { ReactElement, ReactNode } from "react";
import { Text } from "@mantine/core";

interface EyebrowProps {
  children: ReactNode;
  align?: "right";
  // Only for a card on a colour block, where the dim ink would vanish.
  color?: string;
}

export function Eyebrow({ children, align, color }: EyebrowProps): ReactElement {
  return (
    <Text
      className="tabular-nums"
      fz={11}
      fw={400}
      tt="uppercase"
      lts="var(--tracking-label)"
      c={color ?? "var(--color-text-dim)"}
      ta={align}
      lineClamp={1}
    >
      {children}
    </Text>
  );
}
