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
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const rideMetrics = {
    name: activityData.name,
    sport_type: activityData.sport_type,
    distance_km: (activityData.distance / 1000).toFixed(1),
    moving_time_min: Math.round(activityData.moving_time / 60),
    elevation_gain_m: activityData.total_elevation_gain,
    avg_speed_kmh: (activityData.average_speed * 3.6).toFixed(1),
    max_speed_kmh: (activityData.max_speed * 3.6).toFixed(1),
    avg_heartrate: activityData.average_heartrate,
    max_heartrate: activityData.max_heartrate,
    avg_temp_c: activityData.average_temp,
  };

  const prompt = `Zhodnoť tuto jízdu na kole stručně (2-3 věty česky):
${JSON.stringify(rideMetrics, null, 2)}`;

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

export function MeasureTime(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
}
