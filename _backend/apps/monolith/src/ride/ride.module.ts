import { Module } from '@nestjs/common';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceTrackingModule } from '../service-tracking/service-tracking.module';

@Module({
  imports: [PrismaModule, ServiceTrackingModule],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
