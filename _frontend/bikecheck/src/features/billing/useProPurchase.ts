import { useRef, useState } from "react";
import { proPayment } from "./proPayment";
import { PRO_SALES } from "./proSales";

export type PurchaseStep = "summary" | "confirming" | "paymentFailed" | "paid";

export interface ProPurchase {
  // Null outside the purchase, and always without sales.
  step: PurchaseStep | null;
  // Null until the payment passes.
  paidAt: string | null;
  showSummary: () => void;
  leave: () => void;
  pay: () => Promise<void>;
}

// The purchase steps of the Pro sheet.
export function useProPurchase(): ProPurchase {
  const [step, setStep] = useState<PurchaseStep | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  // A double tap lands before the confirming step is drawn.
  const isPaying = useRef(false);

  async function pay(): Promise<void> {
    if (!PRO_SALES || step !== "summary" || isPaying.current) return;
    isPaying.current = true;
    setStep("confirming");
    const result = await proPayment.pay();
    isPaying.current = false;
    if (result.status === "paid") setPaidAt(result.paidAt);
    setStep(result.status === "paid" ? "paid" : "paymentFailed");
  }

  return {
    step,
    paidAt,
    showSummary: () => {
      if (PRO_SALES) setStep("summary");
    },
    leave: () => setStep(null),
    pay,
  };
}
