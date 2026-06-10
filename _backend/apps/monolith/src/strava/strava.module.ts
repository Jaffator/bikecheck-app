import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StravaEventsProcessor } from './strava.processor';
import { StravaEventsService } from './strava.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'strava-events-queue' })],
  providers: [StravaEventsProcessor, StravaEventsService],
})
export class StravaModule {}
