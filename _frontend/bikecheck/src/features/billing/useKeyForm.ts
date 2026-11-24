import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ADD_BIKE } from "@/layout/navItems";
import { useBikeLimitStore } from "@/store/store";
import { hasRoom } from "./bikeLimit";
import { useRedeemKey } from "./billing.queries";
import type { BikeLimit } from "./billing.types";
import { redeemFailureText } from "./redeemFailure";
import { useAddBikeGate } from "./useAddBikeGate";

interface KeyForm {
  code: string;
  setCode: (code: string) => void;
  canSubmit: boolean;
  isPending: boolean;
  // A translation key; null while nothing was refused.
  failure: string | null;
  submit: () => void;
}

// The key entered on the limit sheet, and the way on to the wizard the sheet stood in front of.
export function useKeyForm(): KeyForm {
  const { pathname } = useLocation();
  const enterAddBike = useAddBikeGate();
  const redeem = useRedeemKey(goOn);
  const [code, setCode] = useState("");

  const trimmed = code.trim();
  const canSubmit = trimmed !== "";

  function goOn(limit: BikeLimit): void {
    const { opened, hide } = useBikeLimitStore.getState();
    // Closed meanwhile, or over the raised limit too: the rider stays where they are.
    if (!opened || !hasRoom(limit)) return;
    hide();
    // Refused on save, the wizard is already open with everything entered.
    if (pathname !== ADD_BIKE.path) void enterAddBike();
  }

  return {
    code,
    setCode: (next) => {
      setCode(next);
      redeem.reset();
    },
    canSubmit,
    isPending: redeem.isPending,
    failure: redeem.error === null ? null : redeemFailureText(redeem.error),
    submit: () => {
      if (!canSubmit || redeem.isPending) return;
      redeem.mutate(trimmed);
    },
  };
}
