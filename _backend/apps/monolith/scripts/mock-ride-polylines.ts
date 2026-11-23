// DEV ONLY: gives every ride without a route one of the sample Strava routes, so the maps can be seen.
// Real routes come from backfill-ride-polylines.ts; this never touches a ride that already has one.
import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: resolve(__dirname, '../.env') });
const SAMPLES_DIR = resolve(__dirname, '../../strava-service/src/example_strava_data/set_data');
const POLYLINE_PATTERN = /"summary_polyline":\s*"([^"]+)"/;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// The sample files hold the polyline JSON-escaped, so backslashes are undone.
function readSampleRoutes(): string[] {
  return readdirSync(SAMPLES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => POLYLINE_PATTERN.exec(readFileSync(resolve(SAMPLES_DIR, file), 'utf-8'))?.[1])
    .filter((route): route is string => route !== undefined)
    .map((route) => JSON.parse(`"${route}"`) as string);
}

async function main(): Promise<void> {
  const routes = readSampleRoutes();
  if (routes.length === 0) throw new Error(`No sample routes in ${SAMPLES_DIR}`);

  const rides = await prisma.rides.findMany({ where: { summary_polyline: null }, select: { id: true } });
  for (const ride of rides) {
    // By id, so a ride keeps the same route on every run.
    await prisma.rides.update({ where: { id: ride.id }, data: { summary_polyline: routes[ride.id % routes.length] } });
  }
  console.log(`Mocked ${rides.length} routes from ${routes.length} samples`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
