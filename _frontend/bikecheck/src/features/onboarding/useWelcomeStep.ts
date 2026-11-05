import { useState } from "react";
import { welcomeTransition } from "./welcomeTransition";

interface WelcomeStep {
  step: number;
  goTo: (next: number) => void;
}

export function useWelcomeStep(): WelcomeStep {
  const [step, setStep] = useState<number>(0);

  const goTo = (next: number): void => {
    welcomeTransition(next > step ? "forward" : "back", () => setStep(next));
  };

  return { step, goTo };
}
