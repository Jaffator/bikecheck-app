import { simulatedPayment } from "./simulatedPayment";

export type ProPaymentResult = { status: "paid"; paidAt: string } | { status: "failed" };

// What Stripe and Google Play will implement. It always settles to a result and never throws.
export interface ProPayment {
  pay: () => Promise<ProPaymentResult>;
}

export const proPayment: ProPayment = simulatedPayment;
