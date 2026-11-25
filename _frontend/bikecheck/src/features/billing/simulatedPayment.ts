import type { ProPayment } from "./proPayment";

const WAIT_MS = 1900;

// Development only: calls no server and changes nothing on the account.
export const simulatedPayment: ProPayment = {
  pay: async () => {
    await new Promise((resolve) => window.setTimeout(resolve, WAIT_MS));
    if (import.meta.env.VITE_PRO_PAYMENT === "failed") return { status: "failed" };
    return { status: "paid", paidAt: new Date().toISOString() };
  },
};
