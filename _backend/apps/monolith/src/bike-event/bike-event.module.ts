import { Module } from '@nestjs/common';
import { BikeEventController } from './bike-event.controller';
import { BikeEventService } from './bike-event.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ServiceTrackingModule } from '../service-tracking/service-tracking.module';

@Module({
  imports: [PrismaModule, StorageModule, ServiceTrackingModule],
  controllers: [BikeEventController],
  providers: [BikeEventService],
  exports: [BikeEventService],
})
export class BikeEventModule {}
