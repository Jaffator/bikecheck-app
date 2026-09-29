// The reader's language on the web page: the browser's on first visit, their last switch
// after. Kept in localStorage - all a page with no session has - so it survives reload and
// the walk from garage to bike.
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyLanguage, detectLanguage, isSupportedLanguage, type SupportedLanguage } from "@/i18n";

const STORAGE_KEY = "pp-lang";

function storedLanguage(): SupportedLanguage | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value !== null && isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage refused (private mode): the switch still works for this page.
  }
}

export interface PublicLanguage {
  language: SupportedLanguage;
  toggle: () => void;
}

export function usePublicLanguage(): PublicLanguage {
  const { i18n } = useTranslation();
  const language: SupportedLanguage = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  // The app applies the account language inside its shell only; out here the choice is the reader's.
  useEffect(() => {
    void applyLanguage(storedLanguage() ?? detectLanguage());
  }, []);

  // i18next and dayjs follow; the query key does not, so nothing refetches.
  const toggle = useCallback(() => {
    const next: SupportedLanguage = language === "cs" ? "en" : "cs";
    storeLanguage(next);
    void applyLanguage(next);
  }, [language]);

  return { language, toggle };
}
