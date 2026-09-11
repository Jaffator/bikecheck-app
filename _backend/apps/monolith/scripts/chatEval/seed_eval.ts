// The eval garage, written into the development database under a user of its own. Everything
// the eval user owns is deleted first, so a run always starts from the same garage - and with
// an empty thread, which is also what puts the daily token budget back to zero.
//
// The catalogue it hangs off - component types, actions and their targets - is not seeded here:
// it belongs to `npm run db:devseed`, and this script fails loudly when a piece of it is missing.
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'node:path';
import {
  BIKES,
  EVAL_CURRENCY,
  EVAL_EMAIL,
  EVAL_LANGUAGE,
  EVAL_NAME,
  EVAL_STRAVA_ATHLETE_ID,
  FORK_SETUP,
  INTERVALS,
  REPORT,
  RIDES,
  SERVICES,
  TIRE_SETUP,
  dayAgo,
  type BikeKey,
} from './fixture';

export interface SeededGarage {
  userId: number;
  // The database id of each fixture bike and part, by fixture key.
  bikeIds: Map<BikeKey, number>;
  partIds: Map<string, number>;
}

export function evalPrisma(): PrismaClient {
  const backendRoot = path.resolve(__dirname, '..', '..');
  dotenv.config({ path: path.join(backendRoot, '.env') });

  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error(`DATABASE_URL is not defined. Expected in ${path.join(backendRoot, '.env')}`);
  }

  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });
}

// Everything the eval user owns, gone. Bikes cascade to their parts, services, setups and
// readings; the thread and the reports are the two that hang off the user instead.
async function wipe(prisma: PrismaClient, userId: number): Promise<void> {
  await prisma.chat_messages.deleteMany({ where: { user_id: userId } });
  await prisma.reports.deleteMany({ where: { user_id: userId } });
  await prisma.rides.deleteMany({ where: { user_id: userId } });
  await prisma.bikes.deleteMany({ where: { user_id: userId } });
}

async function evalUser(prisma: PrismaClient): Promise<number> {
  const user = await prisma.users.upsert({
    where: { email: EVAL_EMAIL },
    update: { language: EVAL_LANGUAGE, currency: EVAL_CURRENCY, strava_athlete_id: EVAL_STRAVA_ATHLETE_ID },
    create: {
      email: EVAL_EMAIL,
      name: EVAL_NAME,
      language: EVAL_LANGUAGE,
      currency: EVAL_CURRENCY,
      strava_athlete_id: EVAL_STRAVA_ATHLETE_ID,
    },
    select: { id: true },
  });

  return user.id;
}

// The catalogue rows the fixture names, resolved to ids once. A name the catalogue does not
// carry is a broken fixture, not an empty answer, so it throws.
async function catalogue(prisma: PrismaClient): Promise<{ types: Map<string, number>; actions: Map<string, number> }> {
  const typeNames = [...new Set(BIKES.flatMap((row) => row.parts.map((part) => part.type)))];
  const actionNames = [...new Set([...SERVICES.map((row) => row.action), ...INTERVALS.map((row) => row.action)])];

  const [types, actions] = await Promise.all([
    prisma.component_types.findMany({
      where: { component_type: { in: typeNames } },
      select: { id: true, component_type: true },
    }),
    prisma.events_action.findMany({
      where: { action_name: { in: actionNames } },
      select: { id: true, action_name: true },
    }),
  ]);

  const typeIds = new Map(types.map((row) => [row.component_type, row.id]));
  const actionIds = new Map(actions.map((row) => [row.action_name, row.id]));

  const missing = [
    ...typeNames.filter((name) => !typeIds.has(name)),
    ...actionNames.filter((name) => !actionIds.has(name)),
  ];
  if (missing.length > 0) {
    throw new Error(`The catalogue is missing ${missing.join(', ')}. Run npm run db:devseed first.`);
  }

  return { types: typeIds, actions: actionIds };
}

// One id the fixture named, or a loud failure - a missing one would otherwise be written as
// null and read back as a garage that quietly lost a part.
function idOf<Key>(ids: Map<Key, number>, key: Key): number {
  const found = ids.get(key);
  if (found === undefined) throw new Error(`Nothing seeded for ${String(key)}`);

  return found;
}

export async function seedEvalGarage(prisma: PrismaClient): Promise<SeededGarage> {
  const userId = await evalUser(prisma);
  await wipe(prisma, userId);

  const { types, actions } = await catalogue(prisma);

  const bikeIds = new Map<BikeKey, number>();
  const partIds = new Map<string, number>();

  for (const fixture of BIKES) {
    const created = await prisma.bikes.create({
      data: {
        user_id: userId,
        bike_brand: fixture.brand,
        bike_model: fixture.model,
        year: fixture.year,
        bike_size: fixture.size,
        bike_weight_kg: fixture.weightKg,
        total_km: fixture.totalKm,
        total_time_min: fixture.totalTimeMin,
        total_elevation_m: fixture.elevationM,
        strava_gear_id: fixture.stravaGearId,
        components_mounted: {
          create: fixture.parts.map((part) => ({
            component_type_id: idOf(types, part.type),
            component_desc: part.desc,
            position: part.position ?? null,
            mounted_at: part.mountedDaysAgo === null ? null : dayAgo(part.mountedDaysAgo),
            total_km: part.totalKm,
            total_time_min: part.totalTimeMin,
            drivetrain_km: part.drivetrainKm ?? 0,
            suspension_min: part.suspensionMin ?? 0,
          })),
        },
      },
      select: { id: true, components_mounted: { orderBy: { id: 'asc' }, select: { id: true } } },
    });

    bikeIds.set(fixture.key, created.id);
    fixture.parts.forEach((part, index) => partIds.set(part.key, created.components_mounted[index].id));
  }

  for (const service of SERVICES) {
    await prisma.events_bikes.create({
      data: {
        bike_id: idOf(bikeIds, service.bike),
        service_date: dayAgo(service.daysAgo),
        total_cost: service.cost,
        note: service.note,
        event_actions_done: {
          create: {
            event_action_id: idOf(actions, service.action),
            partial_cost: service.cost,
            note: service.note,
            part_replaced: service.replaced ?? false,
            action_done_component_map: {
              create: {
                component_mounted_id: idOf(partIds, service.partKey),
                km_at_time: 0,
                time_min_at_time: 0,
                drivetrain_km_at_time: service.baselineDrivetrainKm ?? 0,
                suspension_min_at_time: 0,
              },
            },
          },
        },
      },
    });
  }

  for (const ride of RIDES) {
    await prisma.rides.create({
      data: {
        user_id: userId,
        bike_id: idOf(bikeIds, ride.bike),
        started_at: dayAgo(ride.daysAgo),
        distance_m: ride.km * 1000,
        duration_min: ride.minutes,
        elevation_up_m: ride.elevationM,
      },
    });
  }

  for (const interval of INTERVALS) {
    await prisma.bike_service_interval.create({
      data: {
        bike_id: idOf(bikeIds, interval.bike),
        event_actions_id: idOf(actions, interval.action),
        service_interval_km: interval.km ?? null,
        service_interval_min: interval.min ?? null,
      },
    });
  }

  await prisma.suspension_setup.create({
    data: {
      mounted_component_id: idOf(partIds, FORK_SETUP.partKey),
      pressure_psi: FORK_SETUP.pressurePsi,
      sag_percentage: FORK_SETUP.sagPercentage,
      rebound_ls: FORK_SETUP.reboundLs,
    },
  });

  await prisma.tire_setup.create({
    data: {
      component_mounted_id: idOf(partIds, TIRE_SETUP.partKey),
      tire_pressure_psi: TIRE_SETUP.pressurePsi,
    },
  });

  await prisma.reports.create({
    data: {
      user_id: userId,
      bike_id: idOf(bikeIds, REPORT.bike),
      kind: REPORT.kind,
      public_token: `eval-${Date.now().toString(36)}`,
      snapshot: {},
      is_public: REPORT.isPublic,
    },
  });

  return { userId, bikeIds, partIds };
}

// Seeding on its own, for when only the garage needs putting back.
async function main(): Promise<void> {
  const prisma = evalPrisma();
  try {
    const { userId } = await seedEvalGarage(prisma);
    console.log(`Eval garage seeded for ${EVAL_EMAIL} (user ${String(userId)}).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
