import { useRef, useState } from "react";
import { hasPro } from "./bikeLimit";
import { useBikeLimit, useRedeemKey } from "./billing.queries";
import { redeemFailureText } from "./redeemFailure";

export type ProStep = "offer" | "key" | "keyChecking" | "keyFailed" | "keyDone";

export interface ProSheetState {
  step: ProStep;
  // Which side of the card is up.
  showsBack: boolean;
  code: string;
  setCode: (code: string) => void;
  canSubmit: boolean;
  // A translation key; null while nothing was refused.
  failure: string | null;
  showKey: () => void;
  showOffer: () => void;
  submit: () => void;
}

// The steps of the Pro sheet. It holds one opening: the sheet is remounted for the next.
export function useProSheet(): ProSheetState {
  const { data: limit } = useBikeLimit();
  const redeem = useRedeemKey();
  const [asked, setAsked] = useState<"offer" | "key">("offer");
  const [code, setCode] = useState("");
  // A double tap lands before the checking step is drawn.
  const isSending = useRef(false);

  const step = currentStep();
  const trimmed = code.trim();
  const canSubmit = trimmed !== "" && (step === "key" || step === "keyFailed");

  function currentStep(): ProStep {
    if (limit !== undefined && hasPro(limit)) return "keyDone";
    if (redeem.isPending) return "keyChecking";
    if (redeem.isError) return "keyFailed";
    return asked;
  }

  return {
    step,
    showsBack: step === "key" || step === "keyChecking" || step === "keyFailed",
    code,
    setCode: (next) => {
      setCode(next);
      redeem.reset();
    },
    canSubmit,
    failure: redeem.error === null ? null : redeemFailureText(redeem.error),
    showKey: () => setAsked("key"),
    showOffer: () => {
      setAsked("offer");
      redeem.reset();
    },
    submit: () => {
      if (!canSubmit || isSending.current) return;
      isSending.current = true;
      redeem.mutate(trimmed, {
        onSettled: () => {
          isSending.current = false;
        },
      });
    },
  };
}
