import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RefreshTokenModule } from './refreshtoken/refreshtoken.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core/constants';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './_filters/all-exceptions.filter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BikeModule } from './bike/bike.module';
import { BikeEventModule } from './bike-event/bike-event.module';
import { OrganizationModule } from './organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { StravaModule } from './strava/strava.module';
import { GeminiModule } from './gemini/gemini.module';
import { NotificationModule } from './notification/notification.module';
import { ReportModule } from './report/report.module';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import pino from 'pino';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'strava-monolith-queue',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'strava-webhook-queue',
      adapter: BullMQAdapter,
    }),
    ConfigModule.forRoot({ envFilePath: 'apps/monolith/.env', isGlobal: true }),
    // Global rate limit: 100 requests / 60s per IP. Stricter limits set per-route (e.g. auth).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({ name: 'strava-webhook-queue' }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isTestEnv ? 'silent' : isProductionEnv ? 'info' : 'debug',
        timestamp: pino.stdTimeFunctions.isoTime,
        transport: isTestEnv
          ? undefined
          : {
              targets: [
                {
                  target: 'pino-loki',
                  level: 'info',
                  options: {
                    host: process.env.LOKI_HOST ?? 'http://localhost:3100',
                    labels: { app: 'bikecheck-monolith' },
                    batching: true,
                    interval: 5,
                    replaceTimestamp: true,
                    convertArrays: true,
                  },
                },
                ...(!isProductionEnv
                  ? [
                      {
                        target: 'pino-pretty',
                        level: 'info',
                        options: {
                          colorize: true,
                          singleLine: true,
                          translateTime: 'SYS:standard',
                        },
                      },
                    ]
                  : []),
              ],
            },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      },
    }),
    UserModule,
    AuthModule,
    RefreshTokenModule,
    BikeModule,
    BikeEventModule,
    StorageModule,
    OrganizationModule,
    StravaModule,
    GeminiModule,
    NotificationModule,
    ReportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
