// Fills the map route of rides saved before it was kept, asking Strava again for each one.
// Needs strava-service running. Safe to rerun: only rides still without a route are touched.
import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: resolve(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Strava allows 100 requests per 15 minutes; one every 9.5 s stays under it.
const PAUSE_MS = 9500;
const HTTP_TOO_MANY_REQUESTS = 429;

interface MissingRoute {
  id: number;
  activity_strava_id: bigint;
  users: { strava_athlete_id: string | null };
}

interface StravaRide {
  map?: { summary_polyline?: string | null };
}

function findMissing(): Promise<MissingRoute[]> {
  return prisma.rides.findMany({
    where: {
      summary_polyline: null,
      is_deleted: { not: true },
      activity_strava_id: { not: null },
      users: { strava_athlete_id: { not: null } },
    },
    select: { id: true, activity_strava_id: true, users: { select: { strava_athlete_id: true } } },
    orderBy: { id: 'asc' },
  }) as Promise<MissingRoute[]>;
}

async function fetchRoute(ride: MissingRoute): Promise<string | null> {
  const response = await axios.get<StravaRide>(
    `${process.env.STRAVA_SERVICE_URL}/strava/activity/${ride.users.strava_athlete_id}/${ride.activity_strava_id}`,
    { headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET }, timeout: 30_000 },
  );
  return response.data.map?.summary_polyline || null;
}

function pause(): Promise<void> {
  return new Promise((done) => setTimeout(done, PAUSE_MS));
}

async function main(): Promise<void> {
  const rides = await findMissing();
  console.log(`${rides.length} rides without a route`);
  let filled = 0;

  for (const ride of rides) {
    try {
      const route = await fetchRoute(ride);
      if (route !== null) {
        await prisma.rides.update({ where: { id: ride.id }, data: { summary_polyline: route } });
        filled++;
      }
    } catch (error) {
      // The rate limit ends the run; a ride gone from Strava or any other failure just skips it.
      if (axios.isAxiosError(error) && error.response?.status === HTTP_TOO_MANY_REQUESTS) {
        console.log('Strava rate limit hit, rerun later');
        break;
      }
      console.warn(`Ride ${ride.id} skipped: ${(error as Error).message}`);
    }
    await pause();
  }
  console.log(`Filled ${filled} routes`);
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
