/* eslint-disable @typescript-eslint/no-unsafe-call */
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env') });
import { GoogleGenerativeAI } from '@google/generative-ai';
import activityData from './simplified_strava_data.json';

const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!);
console.log(process.env['GEMINI_API_KEY']!);
async function run() {
  // const model = gen
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `Give me bike type and suspension type, based on bike name, answer in JSON format with key: type: Road, Enduro, XC, Gravel, Downhill, suspension: hardtail, full, none. Bike name: Canyon Spectral`;

  const result = await withMeasure('gemini prompt', () => model.generateContent(prompt));
  console.log(result.response.text());
}

run().catch(console.error);

async function withMeasure(name: string, fn: () => Promise<any>) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} ms`);
  return result;
}
