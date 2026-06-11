import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './strava-webhook.controller';
import { StravaWebhookService } from './strava-webhook.service';
import { StravaProcessor } from './strava-webhook.processor';
import { TokenModule } from '../tokens/tokens.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'strava-webhook-queue' }),
    BullModule.registerQueue({ name: 'strava-monolith-queue' }),
    TokenModule,
    DatabaseModule,
  ],
  controllers: [WebhookController],
  providers: [StravaWebhookService, StravaProcessor],
})
export class WebhookModule {}
