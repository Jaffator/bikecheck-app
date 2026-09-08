import type { ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { ActionIcon, Group, Text } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";

// PROTOTYPE ONLY - throwaway switcher, never ships. See branch prototype/chat-page.

interface PrototypeSwitcherProps {
  variants: { key: string; name: string }[];
}

// Cycles the ?variant= param so a variant is shareable and survives reload.
export function PrototypeSwitcher({ variants }: PrototypeSwitcherProps): ReactElement | null {
  const [params, setParams] = useSearchParams();
  const current = params.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );

  const go = (step: number): void => {
    const next = variants[(index + step + variants.length) % variants.length];
    setParams({ variant: next.key }, { replace: true });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      // Leaves arrow keys alone while the user is typing.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (import.meta.env.PROD) return null;

  return (
    <Group
      gap={4}
      wrap="nowrap"
      className="fixed left-1/2 z-[300] -translate-x-1/2 rounded-full border border-yellow-400 bg-black/90 px-2 py-1"
      style={{ bottom: "calc(5.5rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" }}
    >
      <ActionIcon variant="subtle" c="yellow" onClick={() => go(-1)} aria-label="previous variant">
        <ChevronLeft size={16} />
      </ActionIcon>
      <Text size="xs" c="yellow" fw={700} className="whitespace-nowrap font-mono">
        {variants[index].key} — {variants[index].name}
      </Text>
      <ActionIcon variant="subtle" c="yellow" onClick={() => go(1)} aria-label="next variant">
        <ChevronRight size={16} />
      </ActionIcon>
    </Group>
  );
}
