import { Module } from '@nestjs/common';
import { BikeEventController } from './bike-event.controller';
import { BikeEventService } from './bike-event.service';
import { BikeEventRepository } from './bike-event.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [BikeEventController],
  providers: [BikeEventService, BikeEventRepository, PrismaService],
  exports: [BikeEventService, BikeEventRepository],
})
export class BikeEventModule {}
