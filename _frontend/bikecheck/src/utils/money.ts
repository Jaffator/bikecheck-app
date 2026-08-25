// The currency a user has not chosen one for. Most of the app's users are Czech.
export const FALLBACK_CURRENCY = "CZK";

// The currencies offered in settings. Intl formats any ISO code, so this list is what the
// app chooses to show, not what it is able to write.
export const SUPPORTED_CURRENCIES = ["CZK", "EUR"];

// Renders a cost in the user's own currency, in the format their language writes it.
// Whole units only: a service costs 2 400, not 2 400.00.
export function formatCost(amount: number, currency: string | null, language: string): string {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: currency ?? FALLBACK_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Just the currency mark a price is written with - "Kč", "€" - taken from the same
// formatter that writes the amounts, so a field and the detail that reads it back can
// never name the currency differently. Follows the language too: Intl writes CZK as "Kč"
// in Czech and "CZK" in English, which is what those readers expect to see.
export function currencySymbol(currency: string | null, language: string): string {
  return (
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency ?? FALLBACK_CURRENCY,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? ""
  );
}
