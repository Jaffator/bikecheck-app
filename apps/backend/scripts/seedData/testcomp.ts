import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import dotenv from 'dotenv';

const main = async () => {
  // prepare env path
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  dotenv.config({ path: envPath });

  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(`DATABASE_URL is not defined. Expected in ${envPath}`);
  }

  // create prisma instance
  console.log('connecting to db...');
  const pool = new Pool({ connectionString });

  const adapter: PrismaPg = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const result = await prisma.bike_brands.findFirst({});
  console.log(result);
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('Error running testcomp:', err);
  process.exit(1);
});
