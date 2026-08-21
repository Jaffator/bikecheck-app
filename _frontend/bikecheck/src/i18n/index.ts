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

// Use the locale primary subtag.
export function detectLanguage(): SupportedLanguage {
  const primary = navigator.language.split("-")[0];
  return isSupportedLanguage(primary) ? primary : "en";
}

// Keep i18next and dayjs locales aligned.
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
  // React escapes rendered values.
  interpolation: { escapeValue: false },
});

dayjs.locale(i18n.language);

export default i18n;
