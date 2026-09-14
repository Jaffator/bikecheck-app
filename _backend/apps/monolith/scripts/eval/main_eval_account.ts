import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { BuildEvalAccount } from './eval_account';

// prepare env path
const currentDirPath: string = __dirname;
const backendRootPath: string = path.resolve(currentDirPath, '..', '..');
dotenv.config({ path: path.join(backendRootPath, '.env') });
const connectionString: string | undefined = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(`DATABASE_URL is not defined. Expected in ${path.join(backendRootPath, '.env')}`);
}
const pool = new Pool({ connectionString });

function connectToDB(): PrismaClient {
  console.log('connecting to db...');

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
  console.log('Prisma Client connected to db...');
  return prisma;
}

export async function runBuild(): Promise<void> {
  const prisma = connectToDB();
  try {
    await new BuildEvalAccount(prisma).run();
  } finally {
    await pool.end();
    await prisma.$disconnect();
  }
}

runBuild().catch((error) => {
  console.error('Error building the eval account:', error);
  process.exit(1);
});
