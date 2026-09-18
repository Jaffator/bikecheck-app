// PROTOTYPE #121 / #128 — throwaway. Floating bar: ←/→ cycle the Follows screen variant
// (kept in ?variant= so a URL is shareable), a segmented control flips the visibility
// state, and a toggle empties the follow lists to look at the empty states. Dev builds only.
import { useEffect, useRef, type ReactElement } from "react";
import { ActionIcon, Group, SegmentedControl, Switch, Text } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  usePrototypeStore,
  VARIANTS,
  VARIANT_NAMES,
  VISIBILITY_LABEL,
  type Variant,
  type Visibility,
} from "./prototype.store";

// Above the tab bar and its safe-area margin.
const BAR_BOTTOM = "calc(5.5rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

function isVariant(value: string | null): value is Variant {
  return value !== null && (VARIANTS as string[]).includes(value);
}

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function PrototypeSwitcher(): ReactElement | null {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const variant = usePrototypeStore((state) => state.variant);
  const setVariant = usePrototypeStore((state) => state.setVariant);
  const visibility = usePrototypeStore((state) => state.visibility);
  const setVisibility = usePrototypeStore((state) => state.setVisibility);
  const seed = usePrototypeStore((state) => state.seed);
  const empty = usePrototypeStore(
    (state) => Object.keys(state.following).length === 0 && Object.keys(state.followers).length === 0,
  );

  // The URL wins once, on load; after that the store wins and re-stamps the URL on every
  // route and every change - otherwise a click would be undone by the stale param.
  const initialized = useRef(false);
  useEffect(() => {
    const fromUrl = params.get("variant");
    if (!initialized.current) {
      initialized.current = true;
      if (isVariant(fromUrl) && fromUrl !== variant) {
        setVariant(fromUrl);
        return;
      }
    }
    if (fromUrl !== variant) {
      const next = new URLSearchParams(params);
      next.set("variant", variant);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, variant]);

  function cycle(step: number): void {
    const index = VARIANTS.indexOf(variant);
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length];
    setVariant(next);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (isTyping()) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  if (!import.meta.env.DEV) return null;

  return (
    <Group
      gap={6}
      wrap="nowrap"
      style={{
        position: "fixed",
        left: "50%",
        bottom: BAR_BOTTOM,
        transform: "translateX(-50%)",
        zIndex: 500,
        padding: "4px 8px",
        borderRadius: 9999,
        backgroundColor: "#f4f4f5",
        color: "#141414",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        border: "2px solid #ff4fd8",
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <ActionIcon
        variant="subtle"
        color="dark"
        radius="xl"
        size="sm"
        aria-label="Předchozí varianta"
        onClick={() => cycle(-1)}
      >
        <ChevronLeft size={16} />
      </ActionIcon>
      <Text className="font-mono" fz={11} fw={700} style={{ whiteSpace: "nowrap" }}>
        {variant} — {VARIANT_NAMES[variant]}
      </Text>
      <ActionIcon
        variant="subtle"
        color="dark"
        radius="xl"
        size="sm"
        aria-label="Další varianta"
        onClick={() => cycle(1)}
      >
        <ChevronRight size={16} />
      </ActionIcon>
      <SegmentedControl
        size="xs"
        radius="xl"
        value={visibility}
        onChange={(value) => setVisibility(value as Visibility)}
        data={(["OFF", "FOLLOWERS", "PUBLIC"] as Visibility[]).map((value) => ({
          value,
          label: VISIBILITY_LABEL[value],
        }))}
        styles={{
          root: { backgroundColor: "#dcdcdf" },
          indicator: { backgroundColor: "#ffffff" },
          label: { color: "#141414", fontSize: 10, padding: "4px 6px" },
        }}
      />
      <Switch
        size="xs"
        color="#ff4fd8"
        checked={empty}
        onChange={(event) => seed(event.currentTarget.checked ? "empty" : "full")}
        label="prázdné"
        styles={{ label: { color: "#141414", fontSize: 10, paddingInlineStart: 4, whiteSpace: "nowrap" } }}
      />
    </Group>
  );
}
