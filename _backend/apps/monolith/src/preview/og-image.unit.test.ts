import sharp from 'sharp';
import { letterboxJpeg, neutralJpeg, OG_BACKGROUND } from './og-image';

// A 2:1 white frame, the shape every stored bike photo has once the garage letterboxed it.
async function whiteFrame(width: number, height: number): Promise<Buffer> {
  return await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .webp()
    .toBuffer();
}

// Clipped Gaussian noise is the least compressible picture there is: the worst case for the ceiling.
async function noise(): Promise<Buffer> {
  return await sharp({
    create: { width: 1200, height: 630, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 1000 } },
  })
    .png()
    .toBuffer();
}

async function pixel(image: Buffer, left: number, top: number): Promise<number[]> {
  const raw = await sharp(image).extract({ left, top, width: 1, height: 1 }).raw().toBuffer();
  return [...raw];
}

describe('OG image', () => {
  it('frames the whole photo in 1200x630 JPEG on the page background, never cropping it', async () => {
    const out = await letterboxJpeg(await whiteFrame(800, 400));

    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    // 2:1 into 1.9:1 leaves a 15px bar top and bottom: background there, photo in the middle.
    const [r, g, b] = await pixel(out, 600, 5);
    expect(r).toBeLessThan(20);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
    const [cr, cg, cb] = await pixel(out, 600, 315);
    expect(cr).toBeGreaterThan(240);
    expect(cg).toBeGreaterThan(240);
    expect(cb).toBeGreaterThan(240);
  });

  it('flattens a transparent cut-out onto the same background', async () => {
    const cutOut = await sharp({ create: { width: 400, height: 400, channels: 4, background: '#ffffff00' } })
      .png()
      .toBuffer();

    const out = await letterboxJpeg(cutOut);

    const [r, g, b] = await pixel(out, 600, 315);
    expect(r).toBeLessThan(20);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
  });

  it('stays under 600 KB however busy the photo', async () => {
    const out = await letterboxJpeg(await noise());

    expect(out.length).toBeLessThan(600_000);
  });

  it('draws the neutral card as the background alone when there is no logo', async () => {
    const out = await neutralJpeg(null);

    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(OG_BACKGROUND).toBe('#0a0a0b');
  });

  it('centres the logo on the neutral card', async () => {
    const logo = await sharp({ create: { width: 640, height: 130, channels: 4, background: '#e0e0e0ff' } })
      .png()
      .toBuffer();

    const out = await neutralJpeg(logo);

    const [r] = await pixel(out, 600, 315);
    expect(r).toBeGreaterThan(200);
    const [edge] = await pixel(out, 20, 20);
    expect(edge).toBeLessThan(20);
  });
});
