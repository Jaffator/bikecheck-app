import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceTrackingModule } from '../service-tracking/service-tracking.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [PrismaModule, ServiceTrackingModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
