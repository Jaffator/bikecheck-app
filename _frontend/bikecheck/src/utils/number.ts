// Thousands split by a space in every language, as Czech writes them; the decimal mark still
// follows the language. A no-break space, so a figure never wraps mid-number.
const GROUP_SEPARATOR = " ";

export function formatNumber(value: number, language: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(language, options)
    .formatToParts(value)
    .map((part) => (part.type === "group" ? GROUP_SEPARATOR : part.value))
    .join("");
}
