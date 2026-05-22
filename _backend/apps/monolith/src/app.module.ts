import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RefreshTokenModule } from './refreshtoken/refreshtoken.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core/constants';
import { BikeModule } from './bike/bike.module';
import { BikeEventModule } from './bike-event/bike-event.module';
import { OrganizationModule } from './organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';

@Module({
  imports: [
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
    UserModule,
    AuthModule,
    RefreshTokenModule,
    BikeModule,
    BikeEventModule,
    StorageModule,
    OrganizationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
