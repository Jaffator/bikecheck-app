// PROTOTYPE for #337, never merged: /prototype/onboarding?variant=<key>, no session needed.
import { useCallback, useEffect, type ComponentType, type ReactElement } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  CheckInHintScreen,
  PartsHintScreen,
  ReportsHintScreen,
  RidesHintScreen,
  SetupHintScreen,
  SharingHintScreen,
} from "./HintScreens";
import { LearnPrototype } from "./LearnPrototype";
import { WELCOME_EXCERPTS } from "./WelcomeExcerpts";
import { WELCOME_GRAPHICS } from "./WelcomeGraphics";
import { WelcomePrototype } from "./WelcomePrototype";
import { useHintStore } from "./prototypeStore";

const WELCOME = "welcome";
const WELCOME_UI = "welcome-ui";
const LEARN = "learn";

const VARIANTS = [
  { key: WELCOME, label: "Uvítání" },
  { key: WELCOME_UI, label: "Výřezy" },
  { key: "parts", label: "Díly" },
  { key: "rides", label: "Jízdy" },
  { key: "check-in", label: "Check-in" },
  { key: "setup", label: "Setup" },
  { key: "reports", label: "Reporty" },
  { key: "sharing", label: "Sdílení" },
  { key: LEARN, label: "Učit se" },
];

const HINT_SCREENS: Record<string, ComponentType> = {
  parts: PartsHintScreen,
  rides: RidesHintScreen,
  "check-in": CheckInHintScreen,
  setup: SetupHintScreen,
  reports: ReportsHintScreen,
  sharing: SharingHintScreen,
};

interface SwitcherProps {
  label: string;
  onCycle: (step: number) => void;
}

// Sits on top because the Welcome keeps its main button at the bottom of the screen.
function PrototypeSwitcher({ label, onCycle }: SwitcherProps): ReactElement {
  const reset = useHintStore((state) => state.reset);

  return (
    <Group
      gap={2}
      wrap="nowrap"
      pos="fixed"
      top={8}
      left="50%"
      bg="white"
      px={4}
      style={{ transform: "translateX(-50%)", zIndex: 10000, borderRadius: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
    >
      <UnstyledButton aria-label="Předchozí" onClick={() => onCycle(-1)} c="black" p={4} style={{ display: "flex" }}>
        <ChevronLeft size={18} />
      </UnstyledButton>
      <Text fz={12} fw={700} c="black" miw={52} ta="center">
        {label}
      </Text>
      <UnstyledButton aria-label="Další" onClick={() => onCycle(1)} c="black" p={4} style={{ display: "flex" }}>
        <ChevronRight size={18} />
      </UnstyledButton>
      <UnstyledButton aria-label="Znovu ukázat nápovědy" onClick={reset} c="black" p={4} style={{ display: "flex" }}>
        <RotateCcw size={14} />
      </UnstyledButton>
    </Group>
  );
}

export function OnboardingPrototype(): ReactElement {
  const { i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const index = Math.max(
    0,
    VARIANTS.findIndex((variant) => variant.key === params.get("variant")),
  );
  const variant = VARIANTS[index];
  const replay = params.get("replay") === "1";
  const HintScreen = HINT_SCREENS[variant.key];

  const cycle = useCallback(
    (step: number): void => {
      const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length];
      setParams({ variant: next.key }, { replace: true });
    },
    [index, setParams],
  );

  // The real rows speak the app's language, and without a session it would stay English.
  useEffect(() => {
    void i18n.changeLanguage("cs");
  }, [i18n]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycle]);

  return (
    <>
      {(variant.key === WELCOME || variant.key === WELCOME_UI) && (
        <WelcomePrototype
          key={`${variant.key}-${String(replay)}`}
          graphics={variant.key === WELCOME ? WELCOME_GRAPHICS : WELCOME_EXCERPTS}
          replay={replay}
          onClose={() => setParams({ variant: LEARN }, { replace: true })}
        />
      )}
      {variant.key === LEARN && <LearnPrototype onReplay={() => setParams({ variant: WELCOME, replay: "1" })} />}
      {HintScreen !== undefined && <HintScreen />}
      <PrototypeSwitcher label={variant.label} onCycle={cycle} />
    </>
  );
}
