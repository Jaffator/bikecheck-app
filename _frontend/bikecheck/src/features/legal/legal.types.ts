// One section of a legal document: a heading and the paragraphs under it.
export interface LegalBlock {
  heading: string;
  paragraphs: string[];
}

// delete-account is the page Google Play asks for: deletion without the app installed.
export const LEGAL_DOCUMENTS = ["terms", "privacy", "delete-account"] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number];
