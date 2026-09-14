import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { RunChatEval } from './eval_chat';

// prepare env path
const currentDirPath: string = __dirname;
const backendRootPath: string = path.resolve(currentDirPath, '..', '..');
dotenv.config({ path: path.join(backendRootPath, '.env') });
const connectionString: string | undefined = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(`DATABASE_URL is not defined. Expected in ${path.join(backendRootPath, '.env')}`);
}
const pool = new Pool({ connectionString });

// The running app, which the eval talks to over HTTP. Overridable, because the app answers on
// whatever PORT it was started with and may be reached through a tunnel.
function baseUrl(): string {
  return process.env.EVAL_CHAT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api`;
}

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

export async function runEval(): Promise<boolean> {
  const prisma = connectToDB();
  try {
    return await new RunChatEval(prisma, baseUrl()).run();
  } finally {
    await pool.end();
    await prisma.$disconnect();
  }
}

runEval()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((error) => {
    console.error('Error running the chat eval:', error);
    process.exit(1);
  });
