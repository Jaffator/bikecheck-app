import { useTranslation } from "react-i18next";

export type SeededRowName = (i18nKey: string | null, name: string) => string;

// Seeded rows (component types, service actions, bike types, …) carry an
// i18n_key; user-created ones have null and are shown exactly as typed.
// The raw English name doubles as the fallback, so a key missing from the
// locale file degrades to readable text instead of showing the key itself.
export function useSeededName(): SeededRowName {
  const { t } = useTranslation();

  return (i18nKey, name) => (i18nKey ? t(i18nKey, { defaultValue: name }) : name);
}
