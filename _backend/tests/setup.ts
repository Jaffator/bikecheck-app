import { execSync } from 'child_process';
import dotenv from 'dotenv';
import teardown from './teardown';

// Runs once before the INTEGRATION / E2E projects: a fresh Postgres, migrated the way prod is.
export default async (): Promise<void> => {
  dotenv.config({ path: '.env.test' });

  // Recreated with fresh volumes: a run killed before teardown must not hand its rows to the next one.
  console.log('🐳 1: Starting the test database ...');
  await runOrTeardown('docker compose -f tests/docker-compose.test.yml up -d --wait --force-recreate --renew-anon-volumes');

  // The migration chain, not `db push`: it is what prod runs, and it seeds the catalogue (ADR 0019).
  console.log('🔄 2: Applying migrations ...');
  await runOrTeardown('npx prisma migrate deploy --config apps/monolith/prisma.config.ts');

  console.log('✅ Test database is ready.\n');
};

async function runOrTeardown(command: string): Promise<void> {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    await teardown();
    throw error;
  }
}
