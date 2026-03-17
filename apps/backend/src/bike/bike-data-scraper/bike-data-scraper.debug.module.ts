import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from '../../../shared/prisma.module';
import { BikeDataScrapeService } from './bike-data-scraper.service';

@Module({
  imports: [
    PrismaModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-loki',
          options: {
            host: 'http://localhost:3100',
            labels: { app: 'bikecheck-app' },
            batching: true,
            interval: 5,
          },
        },
      },
    }),
  ],
  providers: [BikeDataScrapeService],
  exports: [BikeDataScrapeService],
})
export class DebugModule {}
