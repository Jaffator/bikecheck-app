import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { BikePageModule } from './bike-page/bike-page.module';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';
// Dev runs the compose Loki; on the Pi logs go only to stdout unless a Loki is configured.
const lokiHost = process.env.LOKI_HOST ?? (isProductionEnv ? undefined : 'http://localhost:3100');

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
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
                          labels: { app: 'scraper' },
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
        redact: ['req.headers["x-internal-secret"]'],
      },
    }),
    BikePageModule,
  ],
})
export class AppModule {}
