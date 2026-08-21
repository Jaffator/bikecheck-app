import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';
import { StravaWebhookService } from './strava-webhook.service';
import stravaJsonData_forTest from '../example_strava_data/example_strava_data.json';

// Decorator name must exactly match the Queue name registered in the module
@Processor('strava-webhook-queue')
export class StravaProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaProcessor.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-monolith-queue') private readonly eventsQueue: Queue,
    private readonly stravaWebhookService: StravaWebhookService,
  ) {
    super();
  }
  // NestJS automatically calls this method when a new job appears in the queue
  async process(job: Job<any, any, string>) {
    if (job.name === 'test-strava-event') {
      console.log(`Processing TEST MOCK STRAVA DATA id: ${job.id}, name: ${job.name}`);
      const slimActivityData = this.stravaWebhookService.simplifyActivityData(this.getRandomMockStravaActivityData());
      return { type: 'test', data: slimActivityData };
    }

    if (job.name === 'process-strava-event') {
      const stravaEvent: StravaWebhookEventDto = job.data;

      // ------------------------ Delete ------------------------
      if (stravaEvent.aspect_type === 'delete') {
        await this.stravaWebhookService.deleteActivityData(stravaEvent.owner_id, stravaEvent.object_id);
        return { type: 'delete', data: stravaEvent };
      }
      this.logger.debug({ custom: true }, `Processing strava event: ${JSON.stringify(stravaEvent)}`);

      // Fetch activity from Strava API
      const activityData = await this.stravaWebhookService.downloadActivity(
        stravaEvent.object_id,
        stravaEvent.owner_id,
      );
      this.logger.debug({ custom: true }, `Gear: ${JSON.stringify(activityData.data.gear)}`);

      // If activity is not Ride or EBikeRide, skip processing
      if (activityData.data.type !== 'EBikeRide' && activityData.data.type !== 'Ride') {
        return { skipped: true, reason: 'Activity type is not Ride or EBikeRide' };
      }
      const slimActivityData = this.stravaWebhookService.simplifyActivityData(activityData.data);

      // Decision based on type activity create / update / delete
      // ------------------------ Create ------------------------
      if (stravaEvent.aspect_type === 'create') {
        await this.stravaWebhookService.saveActivityData(
          activityData.data,
          stravaEvent.owner_id,
          stravaEvent.object_id,
        );
        return { type: 'create', data: slimActivityData };
      }

      // ------------ Update ------------
      if (stravaEvent.aspect_type === 'update') {
        await this.stravaWebhookService.updateActivityData(
          activityData.data,
          stravaEvent.owner_id,
          stravaEvent.object_id,
        );
        return { type: 'update', data: slimActivityData };
      }
    }
  }
  //On Completed
  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any): Promise<void> {
    // If activity not Ride or EBikeRide
    if (result?.skipped === true) {
      this.logger.info({ custom: true }, `Job id: ${job.id} - skipped. Reason: ${result.reason}`);
      return;
    }
    const jobName =
      result.type === 'create' || result.type === 'test'
        ? 'strava_activity-created'
        : result.type === 'update'
          ? 'strava_activity-updated'
          : 'strava_activity-deleted';

    // Continue to queue in monolithic app for further processing
    await this.eventsQueue.add(jobName, result.data);
  }

  // On Failed
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed');
  }
  private getRandomMockStravaActivityData(): typeof stravaJsonData_forTest.data {
    const mockData = structuredClone(stravaJsonData_forTest);

    mockData.data.id = Math.floor(Math.random() * 1_000_000_000);
    mockData.data.start_date = new Date(Date.now() - Math.floor(Math.random() * 1_000_000_000)).toISOString();
    mockData.data.distance = Math.floor(Math.random() * 200) * 10000;
    console.log(mockData.data.distance);
    mockData.data.moving_time = Math.floor(Math.random() * 100000);

    return mockData.data;
  }
}
