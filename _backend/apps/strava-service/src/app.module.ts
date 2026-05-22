import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { WebhookModule } from './strava-webhook/strava-webhook.module';
import { TokenModule } from './tokens/tokens.module';
import { DatabaseModule } from './database/database.module';
import pino from 'pino';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // 1. Connect to Redis running in Docker (localhost:6379)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: 6379,
      },
    }),
    // 2. Register the webhook queue
    BullModule.registerQueue({
      name: 'strava-webhook-queue',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        // serializers = nepřipojuje celý request do logu, jen co napíšu
        serializers: {
          req: () => undefined,
        },
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
                    labels: { app: 'strava-service' },
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
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    WebhookModule,
    TokenModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
