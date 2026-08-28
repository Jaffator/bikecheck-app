import { Module } from '@nestjs/common';
import { BikeEventController } from './bike-event.controller';
import { BikeEventService } from './bike-event.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [BikeEventController],
  providers: [BikeEventService],
  exports: [BikeEventService],
})
export class BikeEventModule {}
