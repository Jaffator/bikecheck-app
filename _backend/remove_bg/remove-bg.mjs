// Smoke test for the self-hosted withoutbg background removal server. Sends one image to
// the container and writes the PNG it answers with, so a change to the model or to the
// container can be checked without the app.
//
//   node remove-bg.mjs
//
// nginx in the container proxies /api/ to the model service, so that prefix is the way in.
// The server takes the raw image bytes and answers with a PNG: a transparent cutout, or
// the grayscale alpha matte when OUTPUT_KIND says so.

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// What to run. Edit these.
// ---------------------------------------------------------------------------

// The photo to strip the background from. Only .jpg and .png; the server takes the bytes
// as they are.
const INPUT_PATH = 'D:\\Projects\\BikeCheck\\_backend\\remove_bg\\test3.jpg';

// Where the result goes. Empty means beside the input, named after it.
const OUTPUT_PATH = 'D:\\Projects\\BikeCheck\\_backend\\remove_bg\\testcutout.png';

// "cutout" for the transparent PNG, "matte" for the grayscale alpha.
const OUTPUT_KIND = 'cutout';

// Where the container listens.
const BASE_URL = 'http://localhost:8080';

// ---------------------------------------------------------------------------

// What the server accepts as a raw body; anything else has to be converted first.
const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// The server refuses work until the model is loaded, so say that plainly rather than
// letting the upload fail with a 503.
async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) throw new Error(`Health check failed: HTTP ${response.status}`);
  const health = await response.json();
  console.log(`server: ${health.model} v${health.version} (${health.status})`);
}

async function removeBackground(inputPath) {
  const extension = extname(inputPath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    throw new Error(`Unsupported input ${extension || '(no extension)'}; use .jpg or .png.`);
  }

  const image = await readFile(inputPath);
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}/api/v1/remove-background?output=${OUTPUT_KIND}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: image,
  });
  const roundTripMs = Date.now() - startedAt;

  if (!response.ok) {
    // Failures answer as JSON, so the server's own reason is what gets reported.
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const png = Buffer.from(await response.arrayBuffer());
  return { png, roundTripMs, latencyMs: response.headers.get('X-Latency-Ms'), sentBytes: image.length };
}

async function main() {
  const inputPath = resolve(INPUT_PATH);
  // Names the result after the input, so a cutout and a matte of one photo do not
  // overwrite each other.
  const outputPath = OUTPUT_PATH
    ? resolve(OUTPUT_PATH)
    : join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}-${OUTPUT_KIND}.png`);

  await checkHealth();
  const result = await removeBackground(inputPath);
  await writeFile(outputPath, result.png);

  console.log(`sent:      ${inputPath} (${(result.sentBytes / 1024).toFixed(1)} kB)`);
  console.log(`received:  ${outputPath} (${(result.png.length / 1024).toFixed(1)} kB, ${OUTPUT_KIND})`);
  console.log(`inference: ${result.latencyMs ?? '?'} ms, round trip ${result.roundTripMs} ms`);
}

main().catch((error) => {
  console.error(`failed: ${error.message}`);
  process.exit(1);
});
