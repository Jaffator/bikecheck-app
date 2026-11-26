import { useRef, useState } from "react";
import { proPayment } from "./proPayment";
import { NEEDS_CONSENT, PRO_SALES } from "./proSales";

export type PurchaseStep = "summary" | "confirming" | "paymentFailed" | "paid";

export interface ProPurchase {
  // Null outside the purchase, and always without sales.
  step: PurchaseStep | null;
  // Null until the payment passes.
  paidAt: string | null;
  consented: boolean;
  setConsented: (consented: boolean) => void;
  canPay: boolean;
  showSummary: () => void;
  leave: () => void;
  pay: () => Promise<void>;
}

// The purchase steps of the Pro sheet.
export function useProPurchase(): ProPurchase {
  const [step, setStep] = useState<PurchaseStep | null>(null);
  const [consented, setConsented] = useState(false);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  // A double tap lands before the confirming step is drawn.
  const isPaying = useRef(false);
  const canPay = step === "summary" && (consented || !NEEDS_CONSENT);

  async function pay(): Promise<void> {
    if (!PRO_SALES || !canPay || isPaying.current) return;
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
    consented,
    setConsented,
    canPay,
    showSummary: () => {
      if (!PRO_SALES) return;
      // Every way to the summary asks again.
      setConsented(false);
      setStep("summary");
    },
    leave: () => setStep(null),
    pay,
  };
}
