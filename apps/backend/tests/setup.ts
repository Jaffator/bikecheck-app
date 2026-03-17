import { execSync } from 'child_process';
import { runSeed } from '../scripts/seedData/main';
import dotenv from 'dotenv';
import teardown from './teardown';

export default async (): Promise<void> => {
  // Načtení testovacích env proměnných
  dotenv.config({ path: '.env.test' });

  // --- 1. Spuštění Dockeru ---
  console.log('🐳 1: Starting Docker containers ...');
  try {
    execSync('docker-compose -f tests/docker-compose.test.yml up -d', { stdio: 'ignore' });
  } catch (error) {
    if (error instanceof Error) {
      console.log('🛑 Error when starting Docker.\n', error);
      await teardown();
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // --- 2. Čekání na DB a Prisma push ---
  console.log('🔄 2: Pushing database schema ...');

  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log('🛑 Error when pushing schema into db.\n', error);
    }
    await teardown();
  }
  console.log('✅ Docker test DB is ready.\n');

  // --- 3. Seeding dat do DB ---
  console.log('🔄 3: Seeding data into database ...\n');
  try {
    await runSeed();
    console.log('✅ --- Seed data completed, DB is ready ---\n');
  } catch (error) {
    if (error instanceof Error) {
      console.log('🛑 Error when seeding db.\n', error.message);
      await teardown();
      throw new Error(`Seeding failed: ${error.message}`);
    }
    throw error;
  }
  console.log('🔄 4: Running tests ...\n');
};
