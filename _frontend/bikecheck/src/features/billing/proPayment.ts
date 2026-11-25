import { simulatedPayment } from "./simulatedPayment";

export type ProPaymentResult = { status: "paid"; paidAt: string } | { status: "failed" };

// What Stripe and Google Play will implement. A refused payment is a result, not a throw.
export interface ProPayment {
  pay: () => Promise<ProPaymentResult>;
}

export const proPayment: ProPayment = simulatedPayment;
