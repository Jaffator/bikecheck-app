import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'node:path';

type DBtype = 'dev' | 'test';

export function connectToDB(type: DBtype = 'dev') {
  // prepare env path
  const currentDirPath: string = __dirname;
  const backendRootPath: string = path.resolve(currentDirPath, '..', '..');
  const envfile = type === 'dev' ? '.env' : `.env.test`;
  dotenv.config({ path: path.join(backendRootPath, envfile) });
  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(`DATABASE_URL is not defined. Expected in ${path.join(backendRootPath, envfile)}`);
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
