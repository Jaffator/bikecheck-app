import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StravaEventsProcessor } from './strava.processor';
import { StravaEventsService } from './strava.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'strava-monolith-queue' }),
    BullModule.registerQueue({ name: 'gemini-queue' }),
    PrismaModule,
  ],
  providers: [StravaEventsProcessor, StravaEventsService],
})
export class StravaModule {}
