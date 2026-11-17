import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';
import { StravaWebhookService } from './strava-webhook.service';
import { TokenService } from '../tokens/tokens.service';
import stravaJsonData_forTest from '../example_strava_data/example_strava_data.json';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PURGE_JOB = 'purge-stale-activities';

// Decorator name must exactly match the Queue name registered in the module
@Processor('strava-webhook-queue')
export class StravaProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    @InjectPinoLogger(StravaProcessor.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-monolith-queue') private readonly eventsQueue: Queue,
    @InjectQueue('strava-webhook-queue') private readonly webhookQueue: Queue,
    private readonly stravaWebhookService: StravaWebhookService,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  // Raw activities are kept for now, so the daily purge is off; upsertJobScheduler turns it back on.
  async onModuleInit(): Promise<void> {
    await this.webhookQueue.removeJobScheduler(PURGE_JOB);
  }
  // NestJS automatically calls this method when a new job appears in the queue
  async process(job: Job<any, any, string>) {
    // ------------------------ Mock Single route ------------------------
    if (job.name === 'test-strava-event-single') {
      console.log(`Processing TEST MOCK STRAVA DATA id: ${job.id}, name: ${job.name}`);
      const slimActivityData = this.stravaWebhookService.simplifyActivityData(this.getRandomMockStravaActivityData());
      return { type: 'test', data: slimActivityData };
    }
    // ------------------------ Mock Set of routes ------------------------
    if (job.name === 'test-strava-event-set') {
      console.log(`Processing TEST MOCK STRAVA DATA SET id: ${job.id}, name: ${job.name}`);
      const dir = './apps/strava-service/src/example_strava_data/set_data';
      for (const file of await readdir(dir)) {
        const activity = JSON.parse(await readFile(join(dir, file), 'utf-8')).data;
        console.log(`Processing file: ${file}, activity: ${activity}`);
        const slimActivityData = this.stravaWebhookService.simplifyActivityData(activity);
        await this.eventsQueue.add('strava_activity-created', slimActivityData);
      }
      return { skipped: true, reason: 'Mock set sent ride by ride' };
    }

    if (job.name === PURGE_JOB) {
      const purged = await this.stravaWebhookService.purgeStaleActivities();
      return { skipped: true, reason: `${purged} raw activities purged` };
    }

    if (job.name === 'process-strava-event') {
      const stravaEvent: StravaWebhookEventDto = job.data;

      // ------------------------ Access revoked on Strava ------------------------
      if (stravaEvent.object_type === 'athlete') {
        // Other athlete updates carry nothing we keep; only a revoked grant needs action (policy §7.4).
        if (stravaEvent.updates.authorized !== 'false') return { skipped: true, reason: 'Athlete update ignored' };
        const wasLinked = await this.tokenService.removeLocalData(stravaEvent.owner_id);
        // An in-app unlink cleans up and notifies the user itself; telling the monolith again would notify twice.
        if (!wasLinked) return { skipped: true, reason: 'Athlete already unlinked' };
        return { type: 'deauthorized', data: { athleteId: stravaEvent.owner_id } };
      }

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
        await this.stravaWebhookService.saveActivityData(
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
          : result.type === 'deauthorized'
            ? 'strava-deauthorized'
            : 'strava_activity-deleted';
    console.log(jobName);
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
    mockData.data.start_date = new Date(Date.now()).toISOString();
    // - Math.floor(Math.random() * 1_000_000_000)).toISOString();
    mockData.data.distance = Math.floor(Math.random() * 200) * 10000;
    mockData.data.moving_time = Math.floor(Math.random() * 100000);

    return mockData.data;
  }
}
