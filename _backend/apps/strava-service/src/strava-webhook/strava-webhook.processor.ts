import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';
import { StravaWebhookService } from './strava-webhook.service';

// Decorator name must exactly match the Queue name registered in the module
@Processor('strava-webhook-queue')
export class StravaProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaProcessor.name) private readonly logger: PinoLogger,
    private readonly stravaService: StravaWebhookService,
  ) {
    super();
  }

  // NestJS automatically calls this method when a new job appears in the queue
  async process(job: Job<any, any, string>) {
    this.logger.info({ custom: true }, `Worker starting job: ${job.id}`);
    if (job.name === 'process-strava-event') {
      const stravaEvent: StravaWebhookEventDto = job.data;
      // console.log('Processing Strava event:', stravaEvent);

      const data = await this.stravaService.downloadActivity(stravaEvent.object_id, stravaEvent.owner_id);
      console.log('data', data);

      // TODO:
      // 1. await this.tokenService.checkToken(athleteId);
      // 3. Save to jsonb DB...
    }
  }
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed');
  }
}
