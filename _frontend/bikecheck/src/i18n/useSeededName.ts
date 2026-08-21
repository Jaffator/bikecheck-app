import { useTranslation } from "react-i18next";

export type SeededRowName = (i18nKey: string | null, name: string) => string;

// Localizes seeded rows and falls back to their raw names.
export function useSeededName(): SeededRowName {
  const { t } = useTranslation();

  return (i18nKey, name) => (i18nKey ? t(i18nKey, { defaultValue: name }) : name);
}
