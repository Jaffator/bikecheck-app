import { Module } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeController } from './bike.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { StorageModule } from '../storage/storage.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, StorageModule, BillingModule],
  controllers: [BikeController],
  providers: [BikeService, BikeDataScrapeService],
  exports: [BikeService, BikeDataScrapeService],
})
export class BikeModule {}
