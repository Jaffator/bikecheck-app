import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StravaEventsProcessor } from './strava.processor';
import { StravaEventsService } from './strava.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { StravaController } from './strava.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'strava-monolith-queue' }),
    BullModule.registerQueue({ name: 'gemini-queue' }),
    PrismaModule,
    NotificationModule,
  ],
  controllers: [StravaController],
  providers: [StravaEventsProcessor, StravaEventsService],
})
export class StravaModule {}
