import { Module } from '@nestjs/common';
import { BikeEventController } from './bike-event.controller';
import { BikeEventService } from './bike-event.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BikeEventController],
  providers: [BikeEventService],
  exports: [BikeEventService],
})
export class BikeEventModule {}
