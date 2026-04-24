import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('BikeCheck API')
    .setDescription('Bikechek API documentation')
    .setVersion('1.0')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => {
        const cleanKey = controllerKey.replace('Controller', '').trim();
        return `${cleanKey}_${methodKey}`;
      },
    });
  SwaggerModule.setup('api', app, documentFactory);

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
