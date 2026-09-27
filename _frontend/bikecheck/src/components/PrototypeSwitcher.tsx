// PROTOTYPE (#165) — throwaway. Flips a page between layout variants via `?variant=`; never ships.
import { useEffect, type ReactElement } from "react";
import { ActionIcon, Group, Text } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { VARIANT_PARAM, usePrototypeVariant, type PrototypeVariant } from "./prototypeVariant";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function PrototypeSwitcher({ variants }: { variants: PrototypeVariant[] }): ReactElement | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = usePrototypeVariant(variants);
  const index = variants.findIndex((variant) => variant.key === current);

  function step(delta: number): void {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams);
    params.set(VARIANT_PARAM, next.key);
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function onKey(event: KeyboardEvent): void {
      if (isTyping(event.target)) return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  return (
    <Group
      gap={4}
      wrap="nowrap"
      px={6}
      py={4}
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        borderRadius: 9999,
        backgroundColor: "#ffffff",
        color: "#000000",
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.5)",
      }}
    >
      <ActionIcon variant="subtle" color="dark" radius="xl" aria-label="Previous variant" onClick={() => step(-1)}>
        <ChevronLeft size={18} />
      </ActionIcon>
      <Text fz={13} fw={700} c="#000000" px={6} style={{ whiteSpace: "nowrap" }}>
        {current} — {variants[index].name}
      </Text>
      <ActionIcon variant="subtle" color="dark" radius="xl" aria-label="Next variant" onClick={() => step(1)}>
        <ChevronRight size={18} />
      </ActionIcon>
    </Group>
  );
}
