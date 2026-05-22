import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './strava-webhook.controller';
import { StravaWebhookService } from './strava-webhook.service';
import { StravaProcessor } from './strava-webhook.processor';
import { TokenModule } from '../tokens/tokens.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'strava-webhook-queue' }), TokenModule],
  controllers: [WebhookController],
  providers: [StravaWebhookService, StravaProcessor],
})
export class WebhookModule {}
