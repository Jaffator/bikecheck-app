import { Module } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeController } from './bike.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [BikeController],
  providers: [BikeService, BikeDataScrapeService],
  exports: [BikeService, BikeDataScrapeService],
})
export class BikeModule {}
