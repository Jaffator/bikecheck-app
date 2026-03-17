import { Module } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeController } from './bike.controller';
import { BikeRepository } from './bike.repository';
import { PrismaModule } from 'shared/prisma.module';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';

@Module({
  imports: [PrismaModule],
  controllers: [BikeController],
  providers: [BikeService, BikeRepository, BikeDataScrapeService],
  exports: [BikeService, BikeDataScrapeService],
})
export class BikeModule {}
