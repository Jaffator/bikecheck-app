// PROTOTYPE for #337, never merged: the Welcome on the real theme, its state in memory only.
import { useState, type ComponentType, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import logoName from "@/assets/logo_name.svg";
import { useIsDesktop } from "@/layout/breakpoints";
import { WELCOME_SLIDES } from "./prototypeData";

const LAST_STEP = WELCOME_SLIDES.length - 1;
const SAFE_TOP = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))";
const SAFE_BOTTOM = "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))";

interface WelcomeViewProps {
  step: number;
  onStep: (step: number) => void;
  onSkip: () => void;
  onAddBike: () => void;
  lastLabel: string;
  graphics: ComponentType[];
}

interface WelcomePrototypeProps {
  // Line drawings or the excerpts from the app, one per slide.
  graphics: ComponentType[];
  // Played again from Learn the app: it closes to where it came from.
  replay: boolean;
  onClose: () => void;
}

function SkipButton({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <UnstyledButton onClick={onClick} mih={44} fz={14} fw={500} c="var(--color-muted)">
      Přeskočit
    </UnstyledButton>
  );
}

function StepDots({ step }: { step: number }): ReactElement {
  return (
    <Group gap={8} aria-label={`Krok ${String(step + 1)} ze ${String(WELCOME_SLIDES.length)}`}>
      {WELCOME_SLIDES.map((slide, index) => (
        <Box
          key={slide.title}
          w={8}
          h={8}
          style={{
            borderRadius: 9999,
            backgroundColor: index === step ? "var(--mantine-color-primary-6)" : "var(--color-border-strong)",
          }}
        />
      ))}
    </Group>
  );
}

function WelcomePhone({ step, onStep, onSkip, onAddBike, lastLabel, graphics }: WelcomeViewProps): ReactElement {
  const slide = WELCOME_SLIDES[step];
  const Excerpt = graphics[step];

  return (
    <Stack gap={0} mih="100dvh" bg="background.9" style={{ paddingTop: SAFE_TOP, paddingBottom: SAFE_BOTTOM }}>
      <Group justify="space-between" wrap="nowrap" px={20} h={60}>
        <img src={logoName} alt="BikeCheck" style={{ height: 22 }} />
        <SkipButton onClick={onSkip} />
      </Group>

      <Stack justify="center" px={20} style={{ flex: "1 1 auto", minHeight: 0 }}>
        <Excerpt />
      </Stack>

      <Stack gap={10} px={24} pt={24} mih={150}>
        <Title order={1} fz={26} lh="32px" fw={700} lts="var(--tracking-display)" c="text.6">
          {slide.title}
        </Title>
        {slide.body !== null && (
          <Text fz={16} lh="24px" c="var(--color-text-dim)">
            {slide.body}
          </Text>
        )}
      </Stack>

      <Box px={24} pt={12} pb={24}>
        {step === LAST_STEP ? (
          <Button fullWidth size="lg" radius="md" c="textDark.6" onClick={onAddBike}>
            {lastLabel}
          </Button>
        ) : (
          <Group justify="space-between" wrap="nowrap">
            <StepDots step={step} />
            <Button size="md" radius="md" c="textDark.6" onClick={() => onStep(step + 1)}>
              Další
            </Button>
          </Group>
        )}
      </Box>
    </Stack>
  );
}

function WelcomeDesktop({ step, onStep, onSkip, onAddBike, lastLabel, graphics }: WelcomeViewProps): ReactElement {
  const Excerpt = graphics[step];

  return (
    <Group gap={0} wrap="nowrap" align="stretch" mih="100dvh" bg="background.9">
      <Stack gap={0} w={560} p={48} bg="background.8" style={{ flexShrink: 0 }}>
        <img src={logoName} alt="BikeCheck" style={{ height: 26, alignSelf: "flex-start" }} />

        <Stack gap={4} justify="center" style={{ flex: "1 1 auto" }}>
          {WELCOME_SLIDES.map((slide, index) => (
            <UnstyledButton
              key={slide.title}
              onClick={() => onStep(index)}
              aria-current={index === step ? "step" : undefined}
              p={16}
              bg={index === step ? "cards.6" : undefined}
              style={{ borderRadius: 12 }}
            >
              <Stack gap={6}>
                <Text fz={18} lh="24px" fw={600} c={index === step ? "text.6" : "var(--color-muted)"}>
                  {slide.title}
                </Text>
                {index === step && slide.body !== null && (
                  <Text fz={15} lh="22px" c="var(--color-text-dim)">
                    {slide.body}
                  </Text>
                )}
              </Stack>
            </UnstyledButton>
          ))}
        </Stack>

        <Group justify="space-between" wrap="nowrap">
          <SkipButton onClick={onSkip} />
          {step === LAST_STEP ? (
            <Button radius="md" c="textDark.6" onClick={onAddBike}>
              {lastLabel}
            </Button>
          ) : (
            <Button radius="md" c="textDark.6" onClick={() => onStep(step + 1)}>
              Další
            </Button>
          )}
        </Group>
      </Stack>

      <Stack justify="center" align="center" p={56} style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Box w={520}>
          <Excerpt />
        </Box>
      </Stack>
    </Group>
  );
}

function WelcomeEnd({ label, onRestart }: { label: string; onRestart: () => void }): ReactElement {
  return (
    <Stack align="center" justify="center" gap="md" mih="100dvh" bg="background.9">
      <Text fz={18} fw={600} c="text.6">
        {label}
      </Text>
      <Button variant="outline" radius="md" onClick={onRestart}>
        Přehrát znovu
      </Button>
    </Stack>
  );
}

export function WelcomePrototype({ graphics, replay, onClose }: WelcomePrototypeProps): ReactElement {
  const isDesktop = useIsDesktop();
  const [step, setStep] = useState<number>(0);
  const [endLabel, setEndLabel] = useState<string | null>(null);

  if (endLabel !== null) {
    return (
      <WelcomeEnd
        label={endLabel}
        onRestart={() => {
          setStep(0);
          setEndLabel(null);
        }}
      />
    );
  }

  const view: WelcomeViewProps = {
    step,
    onStep: setStep,
    onSkip: replay ? onClose : () => setEndLabel("Prázdný Domů"),
    onAddBike: replay ? onClose : () => setEndLabel("Wizard Přidat kolo"),
    lastLabel: replay ? "Hotovo" : "Vytvořit první kolo",
    graphics,
  };
  return isDesktop ? <WelcomeDesktop {...view} /> : <WelcomePhone {...view} />;
}
