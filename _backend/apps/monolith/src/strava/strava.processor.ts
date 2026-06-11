import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaEventsService } from './strava.service';

@Processor('strava-monolith-queue')
export class StravaEventsProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaEventsProcessor.name) private readonly logger: PinoLogger,
    private readonly stravaService: StravaEventsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'strava-authorization':
        await this.stravaService.accountLinked(job.data);
        break;
      case 'strava_activity-created': {
        const analyzedData = await this.stravaService.analyzeStravaData(job.data);
        await this.stravaService.saveAnalyzedData(analyzedData);
        break;
      }
      // case 'strava_activity-updated':
      //   await this.stravaService.activityUpdated(job.data);
      //   break;
      // case 'strava_activity-deleted':
      //   await this.stravaService.activityDeleted(job.data);
      //   break;
      default:
        this.logger.warn({ custom: true, jobName: job.name }, 'Unknown job type');
    }
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.info({ custom: true, jobId: job.id }, 'Job completed: ' + job.name);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed: ' + job.name);
  }
}
