import { useRef, useState } from "react";
import { hasPro } from "./bikeLimit";
import { useBikeLimit, useRedeemKey } from "./billing.queries";
import { redeemFailureText } from "./redeemFailure";
import { useProPurchase, type ProPurchase, type PurchaseStep } from "./useProPurchase";

export type ProStep = "offer" | "key" | "keyChecking" | "keyFailed" | "keyDone" | PurchaseStep;

export interface ProSheetState {
  step: ProStep;
  // Which side of the card is up.
  showsBack: boolean;
  isChecking: boolean;
  code: string;
  setCode: (code: string) => void;
  canSubmit: boolean;
  // A translation key; null while nothing was refused.
  failure: string | null;
  showKey: () => void;
  showOffer: () => void;
  submit: () => void;
  purchase: ProPurchase;
}

// The steps of the Pro sheet. It holds one opening: the sheet is remounted for the next.
export function useProSheet(): ProSheetState {
  const { data: limit } = useBikeLimit();
  const redeem = useRedeemKey();
  const purchase = useProPurchase();
  const [opened, setOpened] = useState<"offer" | "key">("offer");
  const [code, setCode] = useState("");
  // A double tap lands before the checking step is drawn.
  const isSending = useRef(false);

  const step = currentStep();
  const isChecking = step === "keyChecking";
  const trimmed = code.trim();
  const canSubmit = trimmed !== "" && (step === "key" || step === "keyFailed");

  function currentStep(): ProStep {
    if (limit !== undefined && hasPro(limit)) return "keyDone";
    if (redeem.isPending) return "keyChecking";
    if (redeem.isError) return "keyFailed";
    return purchase.step ?? opened;
  }

  return {
    step,
    showsBack: isChecking || step === "key" || step === "keyFailed",
    isChecking,
    code,
    setCode: (next) => {
      if (isSending.current) return;
      setCode(next);
      redeem.reset();
    },
    canSubmit,
    failure: redeem.error === null ? null : redeemFailureText(redeem.error),
    showKey: () => setOpened("key"),
    showOffer: () => {
      setOpened("offer");
      redeem.reset();
      purchase.leave();
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
    purchase,
  };
}
