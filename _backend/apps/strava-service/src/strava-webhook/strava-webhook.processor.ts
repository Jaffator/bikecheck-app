import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';
import { StravaWebhookService } from './strava-webhook.service';
import stravaData from '../example_strava_data.json';

// Decorator name must exactly match the Queue name registered in the module
@Processor('strava-webhook-queue')
export class StravaProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaProcessor.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-monolith-queue') private readonly eventsQueue: Queue,
    private readonly stravaService: StravaWebhookService,
  ) {
    super();
  }
  // NestJS automatically calls this method when a new job appears in the queue
  async process(job: Job<any, any, string>) {
    this.logger.info({ custom: true }, `Worker starting job: ${job.id}`);
    if (job.name === 'process-strava-event') {
      const stravaEvent: StravaWebhookEventDto = job.data;

      // Fetch activity from Strava API
      let activityData = stravaData;
      if ('test' in job.data) {
        // ------- DELETE THIS IN PRODUCTION -------
        // ----- TESTING STRAVA JSON DATA -----
        activityData = stravaData;
        // ------- DELETE THIS IN PRODUCTION -------
        // throw new Error('Test error: Simulating failure in fetching activity data');
      } else activityData = await this.stravaService.downloadActivity(stravaEvent.object_id, stravaEvent.owner_id);

      // If activity is not Ride or EBikeRide, skip processing
      if (activityData.data.type !== 'EBikeRide' && activityData.data.type !== 'Ride') {
        return { skipped: true, reason: 'Activity type is not Ride or EBikeRide' };
      }
      const slimActivityData = this.stravaService.simplifyActivityData(activityData.data);

      // Decision based on type activity create / update / delete
      // Create
      if (stravaEvent.aspect_type === 'create') {
        await this.stravaService.saveActivityData(activityData.data, stravaEvent.owner_id, stravaEvent.object_id);
        return { type: 'create', data: slimActivityData };
      }

      // Update
      if (stravaEvent.aspect_type === 'update') {
        await this.stravaService.updateActivityData(activityData.data, stravaEvent.owner_id, stravaEvent.object_id);
        return { type: 'update', data: slimActivityData };
      }

      // Delete
      if (stravaEvent.aspect_type === 'delete') {
        await this.stravaService.deleteActivityData(stravaEvent.owner_id, stravaEvent.object_id);
        return { type: 'delete', data: null };
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
      result.type === 'create'
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
}
