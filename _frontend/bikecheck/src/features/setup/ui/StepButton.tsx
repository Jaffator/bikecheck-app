// The minus or the plus that moves a setting one notch: a tap steps once, a hold keeps
// stepping. Every stepper on the sheet is one of these, so they all feel the same.
import type { CSSProperties, ReactElement } from "react";
import { Button } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import { useHoldRepeat } from "../useHoldRepeat";
import { stepButtonProps, stepButtonStyle } from "./stepButtonProps";

interface StepButtonProps {
  direction: -1 | 1;
  // Names the press for assistive tech, e.g. "Pressure: one step more".
  label: string;
  // At the end of the range the press is shown but goes nowhere.
  disabled: boolean;
  onStep: () => void;
  h?: number;
  style?: CSSProperties;
}

export function StepButton({ direction, label, disabled, onStep, h, style }: StepButtonProps): ReactElement {
  // A hold that runs the value to the end of its range keeps ticking after the button is
  // disabled; the tick lands here and goes nowhere, so the range is never overshot.
  const hold = useHoldRepeat(() => {
    if (!disabled) onStep();
  });

  return (
    <Button
      {...stepButtonProps}
      h={h ?? stepButtonProps.h}
      style={{ ...stepButtonStyle, ...style }}
      aria-label={label}
      disabled={disabled}
      {...hold}
    >
      {direction < 0 ? <Minus size={15} /> : <Plus size={15} />}
    </Button>
  );
}
