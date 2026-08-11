import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/cs";
import "dayjs/locale/en";
import en from "./locales/en.json";
import cs from "./locales/cs.json";

export const SUPPORTED_LANGUAGES = ["en", "cs"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

// The device reports locales like "cs-CZ" or "en-GB", so only the primary subtag matters.
export function detectLanguage(): SupportedLanguage {
  const primary = navigator.language.split("-")[0];
  return isSupportedLanguage(primary) ? primary : "en";
}

// Single entry point for switching — i18next and dayjs must never drift apart.
export async function applyLanguage(language: string): Promise<void> {
  const supported = isSupportedLanguage(language) ? language : "en";
  await i18n.changeLanguage(supported);
  dayjs.locale(supported);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  // React already escapes everything it renders.
  interpolation: { escapeValue: false },
});

dayjs.locale(i18n.language);

export default i18n;
