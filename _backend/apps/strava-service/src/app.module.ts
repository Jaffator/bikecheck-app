import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { WebhookModule } from './strava-webhook/strava-webhook.module';
import { TokenModule } from './tokens/tokens.module';
import { DatabaseModule } from './database/database.module';
import pino from 'pino';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';
// Dev runs the compose Loki; prod pushes only to a Loki someone configured, stdout is always there.
const lokiHost = process.env.LOKI_HOST ?? (isProductionEnv ? undefined : 'http://localhost:3100');

@Module({
  imports: [
    // 1. Connect to Redis running in Docker (localhost:6379)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: 6379,
      },
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
                ...(lokiHost !== undefined
                  ? [
                      {
                        target: 'pino-loki',
                        level: 'info',
                        options: {
                          host: lokiHost,
                          labels: { app: 'strava-service' },
                          batching: true,
                          interval: 5,
                          replaceTimestamp: true,
                          convertArrays: true,
                        },
                      },
                    ]
                  : []),
                isProductionEnv
                  ? { target: 'pino/file', level: 'info', options: { destination: 1 } }
                  : {
                      target: 'pino-pretty',
                      level: 'info',
                      options: {
                        colorize: true,
                        singleLine: true,
                        translateTime: 'SYS:standard',
                      },
                    },
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
