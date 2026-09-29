// What a link crawler reads of a page: one block of <head> tags, the same for every client.
export type OgType = 'profile' | 'website';

export interface PreviewTags {
  title: string;
  description: string;
  // The canonical page address; crawlers cache the card under it.
  url: string;
  type: OgType;
  image: { url: string; alt: string };
}

// 1200x630 JPEG is the one image spec every preview client accepts (docs/research/og-link-preview.md).
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const SITE_NAME = 'BikeCheck';

// Handles and bike names are the owner's own text; they go into attributes as text, never as markup.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function meta(attribute: 'property' | 'name', key: string, value: string): string {
  return `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
}

export function renderOgBlock(tags: PreviewTags): string {
  return [
    `<title>${escapeHtml(tags.title)}</title>`,
    meta('name', 'description', tags.description),
    meta('name', 'robots', 'noindex'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:locale', 'en_US'),
    meta('property', 'og:type', tags.type),
    meta('property', 'og:title', tags.title),
    meta('property', 'og:description', tags.description),
    meta('property', 'og:url', tags.url),
    meta('property', 'og:image', tags.image.url),
    meta('property', 'og:image:width', String(OG_IMAGE_WIDTH)),
    meta('property', 'og:image:height', String(OG_IMAGE_HEIGHT)),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:alt', tags.image.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
  ].join('\n    ');
}

// The shell without its placeholder <title>: two titles and the first one wins.
export function stripTitle(shell: string): string {
  return shell.replace(/<title>[\s\S]*?<\/title>\s*/, '');
}

// Spliced rather than String.replace: a bike called "$&" would otherwise rewrite itself.
export function injectOgBlock(shell: string, block: string): string | null {
  const at = shell.indexOf('</head>');
  if (at === -1) return null;
  return `${shell.slice(0, at)}${block}\n  ${shell.slice(at)}`;
}
