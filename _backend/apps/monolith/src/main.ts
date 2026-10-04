import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  // Caddy sits on the Docker bridge; without this req.ip is Caddy's and every visitor shares one throttle bucket.
  app.set('trust proxy', 'loopback, uniquelocal');
  // SIGTERM from Docker closes the BullMQ workers and Prisma instead of being killed mid-job.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // CORS for the web frontend. Set CORS_ORIGINS (comma-separated) in production;
  // credentials are required because auth uses httpOnly cookies.
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('BikeCheck API')
    .setDescription('Bikechek API documentation')
    .setVersion('1.0')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => {
        const cleanKey = controllerKey.replace('Controller', '').trim();
        return `${cleanKey} ${methodKey}`;
      },
    });
  // The API map (/api, /api-json) is a dev tool; the public host must not serve it.
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  app.get(Logger).log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
