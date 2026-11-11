import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaEventsService } from './strava.service';

const PURGE_JOB = 'strava-purge-stale';

@Processor('strava-monolith-queue')
export class StravaEventsProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    @InjectPinoLogger(StravaEventsProcessor.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-monolith-queue') private readonly queue: Queue,
    private readonly stravaService: StravaEventsService,
  ) {
    super();
  }

  // Upsert, so every restart keeps one daily schedule instead of adding another.
  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(PURGE_JOB, { pattern: '0 3 * * *' }, { name: PURGE_JOB });
  }

  async process(job: Job): Promise<{ message: string } | void> {
    switch (job.name) {
      case PURGE_JOB: {
        const purged = await this.stravaService.purgeStaleAnalyses();
        return { message: `${purged} pending payloads purged` };
      }
      case 'strava-authorization':
        await this.stravaService.accountLinked(job.data);
        break;
      case 'strava_activity-created':
      case 'strava_activity-updated': {
        const analyzedData = await this.stravaService.analyzeStravaData(job.data);
        return await this.stravaService.saveAnalyzedData(analyzedData);
      }
      case 'strava-deauthorized':
        await this.stravaService.stravaDeauthorized(job.data);
        break;
      case 'strava_activity-deleted':
        console.log('Strava activity deleted:', job.data);
        await this.stravaService.deleteStravaActivity(job.data);
        break;
      default:
        this.logger.warn({ custom: true, jobName: job.name }, 'Unknown job type');
    }
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: { message: string } | void): void {
    this.logger.info(
      { custom: true, jobId: job.id, result },
      'Job complete: ' + job.name + ' - ' + (result?.message || 'Job completed'),
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed: ' + job.name);
  }
}
