// Writes the ride review for a sample ride with the real API, in both languages.
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env') });
import type { PinoLogger } from 'nestjs-pino';
import { GeminiService, type RideSummaryInput } from '../src/gemini/gemini.service';
import activityData from './simplified_strava_data.json';

// The service logs through Nest; the console is enough here.
const logger = { info: console.log, error: console.error } as unknown as PinoLogger;

const ride: RideSummaryInput = {
  name: activityData.name,
  sport_type: activityData.sport_type,
  started_at: activityData.start_date,
  bike: 'Orbea Rallon 2024',
  distance_km: Math.round(activityData.distance / 100) / 10,
  duration_min: Math.round(activityData.moving_time / 60),
  elevation_up_m: Math.round(activityData.total_elevation_gain),
  // Strava's payload carries no descent; the sample is a loop, which drops what it climbs.
  elevation_down_m: Math.round(activityData.total_elevation_gain),
  speed_avg_kmh: Math.round(activityData.average_speed * 3.6),
  max_speed_kmh: Math.round(activityData.max_speed * 3.6),
  average_watts: null,
  max_watts: null,
  weighted_average_watts: null,
};

async function run(): Promise<void> {
  const gemini = new GeminiService(logger);
  for (const language of ['en', 'cs']) {
    console.log(`${language}: ${await gemini.rideSummary(ride, language)}`);
  }
}

run().catch(console.error);
