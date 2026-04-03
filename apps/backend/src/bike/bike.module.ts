import { Module } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeController } from './bike.controller';
import { BikeRepository } from './bike.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { ComponentModuleModule } from '../component/component.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [PrismaModule, ComponentModuleModule, StorageModule],
  controllers: [BikeController],
  providers: [BikeService, BikeRepository, BikeDataScrapeService],
  exports: [BikeService, BikeDataScrapeService],
})
export class BikeModule {}
