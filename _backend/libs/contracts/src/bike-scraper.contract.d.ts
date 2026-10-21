// Shared contract between the monolith and the scraper app on the home Pi (ADR 0042).
// Declaration file (.d.ts) on purpose: type-only, never emitted, excluded from rootDir checks.

/** Every scraper call names one provider page; the shared secret rides in the x-scraper-key header. */
export interface ScrapeBikePageRequest {
  url: string;
}

export interface ScrapedBikeCard {
  name: string;
  bikeBrand: string;
  imageUrl: string | null;
  bikeUrl: string;
  kind: 'model' | 'family';
}

export interface ScrapeBikeCardsResponse {
  cards: ScrapedBikeCard[];
}

/** Every table on a bike page, as rows of cell texts; the monolith matches them to component types. */
export interface ScrapeBikeTablesResponse {
  tables: string[][][];
}
