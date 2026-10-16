// The document bodies stay out of the i18n bundle: dozens of paragraphs nobody translates
// row by row would only bloat cs.json and en.json. Only their titles are translated.
import termsCs from "@/legal/terms.cs.json";
import termsEn from "@/legal/terms.en.json";
import privacyCs from "@/legal/privacy.cs.json";
import privacyEn from "@/legal/privacy.en.json";
import deleteAccountCs from "@/legal/delete-account.cs.json";
import deleteAccountEn from "@/legal/delete-account.en.json";
import { isSupportedLanguage, type SupportedLanguage } from "@/i18n";
import { LEGAL_DOCUMENTS, type LegalBlock, type LegalDocumentId } from "./legal.types";

const DOCUMENTS: Record<LegalDocumentId, Record<SupportedLanguage, LegalBlock[]>> = {
  terms: { cs: termsCs, en: termsEn },
  privacy: { cs: privacyCs, en: privacyEn },
  "delete-account": { cs: deleteAccountCs, en: deleteAccountEn },
};

// Header titles live in the translation files; the bodies do not.
export const LEGAL_TITLE_KEYS: Record<LegalDocumentId, string> = {
  terms: "page.legalTerms",
  privacy: "page.legalPrivacy",
  "delete-account": "page.legalDeleteAccount",
};

// Guards the route parameter, which is whatever the address bar holds.
export function isLegalDocumentId(value: string | undefined): value is LegalDocumentId {
  return LEGAL_DOCUMENTS.some((document) => document === value);
}

// Falls back to English for a language a document was never written in.
export function legalDocument(id: LegalDocumentId, language: string): LegalBlock[] {
  const supported = isSupportedLanguage(language) ? language : "en";
  return DOCUMENTS[id][supported];
}
