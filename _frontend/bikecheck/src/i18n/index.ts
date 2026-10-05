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

// The Marketing Website hands its language over as ?lang= (ADR 0041). Kept for the tab, so a
// Google sign-up, which leaves and comes back without the link, still finds it.
const HANDOFF_KEY = "handoff-lang";
const LANG_PARAM = "lang";

export function linkLanguage(): SupportedLanguage | null {
  const value = new URLSearchParams(window.location.search).get(LANG_PARAM);
  return value !== null && isSupportedLanguage(value) ? value : null;
}

function savedHandoffLanguage(): SupportedLanguage | null {
  try {
    const value = sessionStorage.getItem(HANDOFF_KEY);
    return value !== null && isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function saveHandoffLanguage(): void {
  const language = linkLanguage();
  if (language === null) return;
  try {
    sessionStorage.setItem(HANDOFF_KEY, language);
  } catch {
    // Storage refused (private mode): the link still sets this page.
  }
}

// Signed out there is no account language yet; signed in, the shell applies the account's over this.
export function visitorLanguage(): SupportedLanguage {
  return linkLanguage() ?? savedHandoffLanguage() ?? detectLanguage();
}

saveHandoffLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  lng: visitorLanguage(),
  fallbackLng: "en",
  // React escapes rendered values.
  interpolation: { escapeValue: false },
});

dayjs.locale(i18n.language);

export default i18n;
