import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
console.log(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// JSON.stringify spadne na BigInt (rides ho mají) -> převedeme na string.
function toJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val), 2);
}

async function main(): Promise<void> {
  // 2) dotaz z DB (uprav si podle potřeby)
  const rides = await prisma.rides.findFirst({
    where: { id: 47 },
  });
  const data = JSON.parse(rides?.json_data as string);
  console.log(data);
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // zavře pg Pool -> uvolní spojení -> proces hned skončí
  });
