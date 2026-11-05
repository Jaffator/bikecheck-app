import { useState, type ReactElement } from "react";
import { Modal } from "@mantine/core";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { useIsDesktop } from "@/layout/breakpoints";
import { useWelcomeStep } from "../useWelcomeStep";
import { WELCOME_SLIDES } from "../welcomeSlides";
import { welcomeTransition } from "../welcomeTransition";
import { WelcomeIntro } from "./WelcomeIntro";
import { WelcomeSlide } from "./WelcomeSlide";
import "./Welcome.css";

const DIALOG_WIDTH = 960;
const DIALOG_RADIUS = 20;
// Above the phone FAB (200) and the drawers (320): the Welcome covers the whole app.
const Z_INDEX = 400;
// The intro is step 0, the slides follow it.
const LAST_STEP = WELCOME_SLIDES.length;

interface WelcomeProps {
  onSkip: () => void;
  onAddBike: () => void;
}

// Full screen on the phone, a dialog over the app on desktop; one Modal gives both its focus trap.
export function Welcome({ onSkip, onAddBike }: WelcomeProps): ReactElement | null {
  const isDesktop = useIsDesktop();
  const { step, goTo } = useWelcomeStep();
  const [closed, setClosed] = useState<boolean>(false);

  // Closed here so the second snapshot of the transition already has it gone, on a replay too.
  const leave = (action: () => void): void => {
    welcomeTransition("out", () => {
      setClosed(true);
      action();
    });
  };
  const skip = (): void => leave(onSkip);

  // Android's back walks the slides, and past the intro it leaves as Skip does.
  useOverlayBack(!closed, () => (step > 0 ? goTo(step - 1) : skip()));

  if (closed) return null;

  return (
    <Modal.Root
      opened
      onClose={skip}
      fullScreen={!isDesktop}
      size={DIALOG_WIDTH}
      centered
      closeOnEscape={false}
      closeOnClickOutside={false}
      transitionProps={{ duration: 0 }}
      zIndex={Z_INDEX}
    >
      <Modal.Overlay backgroundOpacity={0.7} blur={4} />
      <Modal.Content
        className="welcome-dialog"
        radius={isDesktop ? DIALOG_RADIUS : 0}
        bg="background.9"
        style={{ overflow: "hidden" }}
      >
        {step === 0 ? (
          <WelcomeIntro onStart={() => goTo(1)} onSkip={skip} />
        ) : (
          <WelcomeSlide
            index={step - 1}
            onBack={() => goTo(step - 1)}
            onNext={() => (step === LAST_STEP ? leave(onAddBike) : goTo(step + 1))}
            onSkip={skip}
          />
        )}
      </Modal.Content>
    </Modal.Root>
  );
}
