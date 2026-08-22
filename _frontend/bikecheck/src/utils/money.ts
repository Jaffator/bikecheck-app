// The currency a user has not chosen one for. Most of the app's users are Czech.
const FALLBACK_CURRENCY = "CZK";

// Renders a cost in the user's own currency, in the format their language writes it.
// Whole units only: a service costs 2 400, not 2 400.00.
export function formatCost(amount: number, currency: string | null, language: string): string {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: currency ?? FALLBACK_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}
