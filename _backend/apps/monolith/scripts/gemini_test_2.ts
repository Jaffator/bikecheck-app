import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env') });
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });
async function run() {
  const prompt = `Give me bike type and suspension type, based on bike name, answer in JSON format with key: type: Road, Enduro, XC, Gravel, Downhill, suspension: hardtail, full, none. Bike name: Canyon Spectral`;

  const result = await withMeasure('gemini prompt', () =>
    ai.models.generateContent({ model: 'gemini-2.5-flash-lite', contents: prompt }),
  );
  console.log(result.text);
}

run().catch(console.error);

async function withMeasure(name: string, fn: () => Promise<any>) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} ms`);
  return result;
}
