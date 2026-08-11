// Seeded rows carry a translation key so the client can localize them without
// putting translated text in the database. User-created rows keep i18n_key null
// and are displayed with their raw name.
//
// The key is derived from the English name at seed time, not at render time —
// the client only ever reads the stored value. Renaming a seeded English name
// therefore also changes its key, and the locale files must follow.
export function toI18nKey(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');

  return `${prefix}.${slug}`;
}
