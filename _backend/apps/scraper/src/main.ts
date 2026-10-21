import dotenv from 'dotenv';
dotenv.config({ path: './apps/scraper/.env' });

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3003;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port);
  app.get(Logger).log(`Scraper is running on port ${port}`, 'Bootstrap');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
