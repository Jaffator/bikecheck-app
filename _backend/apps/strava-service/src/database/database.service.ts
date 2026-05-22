import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './apps/strava-service/.env' });

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  constructor(@InjectPinoLogger(DatabaseService.name) private readonly logger: PinoLogger) {}

  /** @internal */
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.error('DATABASE_URL environment variable is not set!');
      throw new Error('DATABASE_URL environment variable is required');
    }
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    try {
      await this.pool.query('SELECT NOW()');
      this.logger.info('Succesfully connected to Strava DB on port 5433!');
    } catch (err) {
      this.logger.error({ err }, '❌ Connection to DB failed!');
    }
  }

  /** @internal */
  async onModuleDestroy() {
    await this.pool.end();
  }
  async query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query<T & Record<string, unknown>>(text, params);
    return result.rows;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
