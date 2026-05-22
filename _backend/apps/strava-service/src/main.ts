import dotenv from 'dotenv';
dotenv.config({ path: './apps/strava-service/.env' });

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger)));

  await app.listen(process.env.PORT ?? 3002);
  app.get(Logger).log(`Strava service from Monorepo a is running on port ${process.env.PORT ?? 3002}`, 'Bootstrap');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
