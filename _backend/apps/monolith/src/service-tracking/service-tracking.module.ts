import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceTrackingController } from './service-tracking.controller';
import { ServiceTrackingService } from './service-tracking.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceTrackingController],
  providers: [ServiceTrackingService],
  exports: [ServiceTrackingService],
})
export class ServiceTrackingModule {}
