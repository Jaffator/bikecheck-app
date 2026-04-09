import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { SeedBikeAddData } from './seed_bikes_infodata';
import { SeedBike } from './seed_bike';
import { SeedComponent } from './seed_type_components';
import { SeedComponentGroups } from './seed_component_groups';
import { SeedMountedComponents } from './seed_mounted_components';
import { SeedUser } from './seed_users';
import dotenv from 'dotenv';
import path from 'node:path';

export function connectToDB() {
  // prepare env path
  const currentDirPath: string = __dirname;
  const backendRootPath: string = path.resolve(currentDirPath, '..', '..');
  dotenv.config({ path: path.join(backendRootPath, '.env') });
  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(`DATABASE_URL is not defined. Expected in ${path.join(backendRootPath, '.env')}`);
  }
  // create prisma instance
  console.log('connecting to db...');
  const pool = new Pool({ connectionString });

  // Suppress unhandled error events from pool
  pool.on('error', (err) => {
    // Ignore connection termination errors during cleanup
    if (err.message?.includes('terminating connection')) {
      return;
    }
    console.error('Unexpected pool error:', err);
  });

  const adapter: PrismaPg = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  if (!prisma) {
    throw new Error('Could not initialize Prisma Client');
  }
  console.log('Prisma Client connected to db...');
  return prisma;
}

// export async function runSeed(): Promise<void> {
//   const prisma = connectToDB();
//   const seedBikeData = new SeedBikeAddData(prisma);
//   const seedBike = new SeedBike(prisma);
//   const seedComponent = new SeedComponent(prisma);
//   const seedComponentGroups = new SeedComponentGroups(prisma);
//   const seedUser = new SeedUser(prisma);
//   const seedMountedComponents = new SeedMountedComponents(prisma);

//   try {
//     // await seedBike.run();
//     // await seedMountedComponents.run();
//     // await seedUser.run();
//     // await seedBikeData.run();
//     // await seedComponent.run();
//     await seedComponentGroups.run();
//   } finally {
//     await prisma.$disconnect();
//   }
// }
// runSeed().catch((error) => {
//   console.error('Error running seed script:', error);
//   process.exit(1);
// });
