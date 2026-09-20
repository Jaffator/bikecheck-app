import sharp, { Sharp } from 'sharp';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './og-tags';

// --pp-ink-950 of publicProfile.css: the letterbox is the page's own background.
export const OG_BACKGROUND = '#0a0a0b';

// WhatsApp shows nothing above 600 KB; the quality steps down until the file fits.
const MAX_BYTES = 600_000;
const QUALITIES = [82, 74, 66, 58, 50];

const LOGO_WIDTH = 480;

// The whole photo in the frame, never cropped: card photos are cut-outs, and a bike
// without its wheels reads as broken.
export async function letterboxJpeg(source: Buffer): Promise<Buffer> {
  const framed = sharp(source)
    .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: 'contain', background: OG_BACKGROUND })
    .flatten({ background: OG_BACKGROUND });
  return await underLimit(framed);
}

// The card of a closed page or a bike without a photo: the background, the logo when it is at hand.
export async function neutralJpeg(logo: Buffer | null): Promise<Buffer> {
  const canvas = sharp({
    create: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, channels: 3, background: OG_BACKGROUND },
  });
  if (logo === null) return await canvas.jpeg({ quality: QUALITIES[0] }).toBuffer();

  const mark = await sharp(logo).resize({ width: LOGO_WIDTH }).toBuffer();
  return await canvas
    .composite([{ input: mark, gravity: 'centre' }])
    .jpeg({ quality: QUALITIES[0] })
    .toBuffer();
}

async function underLimit(image: Sharp): Promise<Buffer> {
  let out = Buffer.alloc(0);
  for (const quality of QUALITIES) {
    out = await image.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length < MAX_BYTES) break;
  }
  return out;
}
