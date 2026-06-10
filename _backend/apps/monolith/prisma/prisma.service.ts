import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    const pool = new Pool({
      connectionString,
      max: 10, // max connections (podle DB serveru)
      min: 2, // drž 2 připravené, nehřej studené připojení
      idleTimeoutMillis: 30_000, // uvolni idle connection po 30s
      connectionTimeoutMillis: 5_000, // nevyčkávej věčně na volný slot → hodí chybu
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  // Graceful shutdown
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('Connected to DB successfully!');
    } catch (err) {
      console.error('Failed to connect to DB:', err);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
