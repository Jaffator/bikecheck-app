// One section of a legal document: a heading and the paragraphs under it.
export interface LegalBlock {
  heading: string;
  paragraphs: string[];
}

export const LEGAL_DOCUMENTS = ["terms", "privacy"] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number];
